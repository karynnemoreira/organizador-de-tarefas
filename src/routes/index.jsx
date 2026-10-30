import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Bell, CalendarDays, Ghost, Pencil, Plus, Trash2 } from "lucide-react";
import { agendarSms, cancelarSms } from "@/lib/sms.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Meu Organizador de Estudos" },
      { name: "description", content: "Organize suas tarefas acadêmicas de forma simples." },
      { property: "og:title", content: "Meu Organizador de Estudos" },
      { property: "og:description", content: "Organize suas tarefas acadêmicas de forma simples." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

const PRIORIDADES = {
  alta: { rotulo: "Alta", cor: "bg-prio-alta", borda: "border-l-prio-alta" },
  media: { rotulo: "Média", cor: "bg-prio-media", borda: "border-l-prio-media" },
  baixa: { rotulo: "Baixa", cor: "bg-prio-baixa", borda: "border-l-prio-baixa" },
};
const DIAS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const LISTA_PADRAO = { id: "geral", nome: "Geral" };

const fmt = (iso) =>
  new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
const mesmoDia = (a, b) => a.toDateString() === b.toDateString();

export function Index() {
  const [tarefas, setTarefas] = useState([]);
  const [listas, setListas] = useState([LISTA_PADRAO]);
  const [listaAtiva, setListaAtiva] = useState("geral");
  const [diaFiltro, setDiaFiltro] = useState(null);
  const [telefone, setTelefone] = useState("");
  const [texto, setTexto] = useState("");
  const [prioridade, setPrioridade] = useState("media");
  const [agenda, setAgenda] = useState("");
  const [lembrete, setLembrete] = useState(false);
  const [novaLista, setNovaLista] = useState("");
  const [aviso, setAviso] = useState("");
  const [anuncio, setAnuncio] = useState("");
  const [carregado, setCarregado] = useState(false);
  const [tarefaEmEdicao, setTarefaEmEdicao] = useState(null);
  const [tituloEditado, setTituloEditado] = useState("");
  const [erroEdicao, setErroEdicao] = useState("");
  const botoesEditar = useRef({});
  const tarefaComFocoDeEdicao = useRef(null);
  const campoNovaTarefa = useRef(null);
  const focarNovaTarefaAposExcluir = useRef(false);

  useEffect(() => {
    try {
      const t = JSON.parse(localStorage.getItem("tarefas") || "[]");
      setTarefas(
        t.map((x) => ({
          criadaEm: new Date(x.id ?? Date.now()).toISOString(),
          prioridade: "media",
          listaId: "geral",
          ...x,
        })),
      );
      const l = JSON.parse(localStorage.getItem("listas") || "null");
      if (l?.length) setListas(l);
      setTelefone(localStorage.getItem("telefone") || "");
    } catch {}
    setCarregado(true);
  }, []);

  useEffect(() => {
    if (!carregado) return;
    localStorage.setItem("tarefas", JSON.stringify(tarefas));
    localStorage.setItem("listas", JSON.stringify(listas));
    localStorage.setItem("telefone", telefone);
  }, [tarefas, listas, telefone, carregado]);

  useEffect(() => {
    if (tarefaEmEdicao !== null) {
      tarefaComFocoDeEdicao.current = tarefaEmEdicao;
      return;
    }
    if (tarefaComFocoDeEdicao.current !== null) {
      botoesEditar.current[tarefaComFocoDeEdicao.current]?.focus();
      tarefaComFocoDeEdicao.current = null;
    }
  }, [tarefaEmEdicao]);

  useEffect(() => {
    if (!focarNovaTarefaAposExcluir.current) return;
    campoNovaTarefa.current?.focus();
    focarNovaTarefaAposExcluir.current = false;
  }, [tarefas]);

  const semana = useMemo(() => {
    const hoje = new Date();
    const inicio = new Date(hoje);
    inicio.setDate(hoje.getDate() - hoje.getDay());
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(inicio);
      d.setDate(inicio.getDate() + i);
      return d;
    });
  }, []);

  const adicionar = async (e) => {
    e.preventDefault();
    const t = texto.trim();
    if (!t) return;
    setAviso("");
    const nova = {
      id: Date.now(),
      texto: t,
      concluida: false,
      criadaEm: new Date().toISOString(),
      prioridade,
      listaId: listaAtiva,
      agendadaPara: agenda ? new Date(agenda).toISOString() : undefined,
    };
    if (lembrete && nova.agendadaPara) {
      const envio = new Date(new Date(nova.agendadaPara).getTime() - 30 * 60000);
      if (envio.getTime() - Date.now() < 16 * 60000) {
        setAviso("O lembrete por SMS precisa de uma tarefa agendada com pelo menos 46 minutos de antecedência.");
        return;
      }
      try {
        const r = await agendarSms({
          data: { to: telefone, body: `Lembrete: "${t}" começa em 30 minutos (${fmt(nova.agendadaPara)}).`, sendAt: envio.toISOString() },
        });
        nova.smsSid = r.sid;
      } catch (err) {
        setAviso(`Tarefa salva, mas o SMS não foi agendado: ${err.message}`);
      }
    }
    setTarefas((p) => [...p, nova]);
    setTexto("");
    setAgenda("");
    setLembrete(false);
    setAnuncio(`Tarefa "${t}" adicionada.`);
  };

  const cancelarEdicao = () => {
    setTarefaEmEdicao(null);
    setTituloEditado("");
    setErroEdicao("");
  };

  const iniciarEdicao = (tarefa) => {
    setTarefaEmEdicao(tarefa.id);
    setTituloEditado(tarefa.texto);
    setErroEdicao("");
  };

  const salvarEdicao = (e) => {
    e.preventDefault();
    const titulo = tituloEditado.trim();
    if (!titulo) {
      setErroEdicao("Informe um título para a tarefa.");
      return;
    }
    setTarefas((atuais) => atuais.map((tarefa) =>
      tarefa.id === tarefaEmEdicao ? { ...tarefa, texto: titulo } : tarefa,
    ));
    setAnuncio(`Tarefa atualizada para "${titulo}".`);
    cancelarEdicao();
  };

  const excluir = (t) => {
    if (tarefaEmEdicao === t.id) {
      tarefaComFocoDeEdicao.current = null;
      cancelarEdicao();
    }
    if (t.smsSid) cancelarSms({ data: { sid: t.smsSid } }).catch(() => {});
    setTarefas((p) => p.filter((x) => x.id !== t.id));
    setAnuncio(`Tarefa "${t.texto}" excluída.`);
    focarNovaTarefaAposExcluir.current = true;
  };

  const criarLista = (e) => {
    e.preventDefault();
    const n = novaLista.trim();
    if (!n) return;
    const id = String(Date.now());
    setListas([...listas, { id, nome: n }]);
    setListaAtiva(id);
    setNovaLista("");
    setAnuncio(`Lista "${n}" criada.`);
  };

  const excluirLista = (id) => {
    tarefas.filter((t) => t.listaId === id).forEach(excluir);
    const nomeLista = listas.find((lista) => lista.id === id)?.nome;
    setListas(listas.filter((l) => l.id !== id));
    setListaAtiva("geral");
    if (nomeLista) setAnuncio(`Lista "${nomeLista}" excluída.`);
  };

  const ordem = { alta: 0, media: 1, baixa: 2 };
  const visiveis = tarefas
    .filter((t) => t.listaId === listaAtiva)
    .filter((t) => !diaFiltro || (t.agendadaPara && mesmoDia(new Date(t.agendadaPara), new Date(diaFiltro))))
    .sort((a, b) => Number(a.concluida) - Number(b.concluida) || ordem[a.prioridade] - ordem[b.prioridade]);

  const concluidas = tarefas.filter((t) => t.concluida).length;
  const card = "rounded-2xl border border-border bg-card p-5 shadow-card sm:p-6";
  const campo =
    "rounded-xl border border-input bg-background px-4 py-3 text-base text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background";

  return (
    <main aria-label="Organizador de estudos" className="min-h-screen bg-background px-4 py-8 font-sans sm:px-6 sm:py-12">
      <div className="mx-auto max-w-6xl space-y-6 sm:space-y-8">
        <header className="flex flex-col items-start gap-3 py-2 sm:flex-row sm:items-center sm:gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-secondary text-primary sm:h-14 sm:w-14">
            <Ghost aria-hidden="true" className="h-7 w-7 sm:h-8 sm:w-8" />
          </div>
          <div className="min-w-0 w-full sm:w-auto sm:flex-1">
            <p className="mb-1 font-accent text-lg font-bold uppercase tracking-[0.12em] text-accent">Seu espaço de estudos</p>
            <h1 className="break-words font-display text-2xl leading-tight text-primary sm:text-5xl">Meu Organizador de Estudos</h1>
            <p className="mt-2 text-lg text-muted-foreground">Uma rotina mais leve, sem sustos e cheia de conquistas.</p>
          </div>
        </header>

        <section aria-label="Resumo das tarefas" className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
          <div className={`${card} flex min-h-24 flex-col justify-center`}>
            <p className="font-display text-4xl leading-none text-primary">{tarefas.length}</p>
            <p className="mt-1 text-base text-muted-foreground">Tarefas cadastradas</p>
          </div>
          <div className={`${card} flex min-h-24 flex-col justify-center`}>
            <p className="font-display text-4xl leading-none text-accent">{concluidas}</p>
            <p className="mt-1 text-base text-muted-foreground">Tarefas concluídas</p>
          </div>
        </section>

        <section aria-labelledby="semana-heading" className={card}>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 id="semana-heading" className="font-display text-2xl text-foreground sm:text-3xl">Esta semana</h2>
            {diaFiltro && (
              <Button variant="ghost" onClick={() => {
                setDiaFiltro(null);
                setAnuncio("Filtro de dia removido.");
              }} className="min-h-11 whitespace-normal text-left text-base font-semibold text-primary">
                Ver todos os dias
              </Button>
            )}
          </div>
          <div role="group" aria-label="Filtrar tarefas por dia" className="-mx-1 overflow-x-auto overscroll-x-contain px-1 pb-2 sm:mx-0 sm:overflow-visible sm:px-0 sm:pb-0">
            <div className="grid w-max grid-flow-col grid-rows-1 gap-2 sm:w-full sm:grid-flow-row sm:grid-cols-7">
            {semana.map((d) => {
              const hoje = mesmoDia(d, new Date());
              const ativo = diaFiltro && mesmoDia(d, new Date(diaFiltro));
              const qtd = tarefas.filter((t) => t.agendadaPara && mesmoDia(new Date(t.agendadaPara), d)).length;
              const nomeDia = d.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
              return (
                <Button variant="ghost"
                  key={d.toISOString()}
                  onClick={() => {
                    setDiaFiltro(ativo ? null : d.toISOString());
                    setAnuncio(ativo ? "Filtro de dia removido." : `Exibindo tarefas para ${nomeDia}.`);
                  }}
                  aria-label={`${nomeDia}${qtd ? `, ${qtd} tarefa${qtd > 1 ? "s" : ""} agendada${qtd > 1 ? "s" : ""}` : ""}`}
                  aria-pressed={Boolean(ativo)}
                  className={`h-auto min-h-20 w-14 min-w-14 flex-col gap-0 rounded-xl border p-1 text-center transition whitespace-normal sm:min-h-24 sm:w-auto sm:min-w-0 sm:flex-1 sm:p-2 ${
                    ativo
                      ? "border-primary bg-primary text-primary-foreground"
                      : hoje
                        ? "border-primary bg-primary/10"
                        : "border-border bg-background hover:bg-muted"
                  }`}
                >
                  <span className="font-display text-xl leading-none sm:text-2xl">{d.getDate()}</span>
                  <span className="text-sm font-bold">{DIAS[d.getDay()]}</span>
                  <span className="text-sm">{qtd ? `${qtd} tarefa${qtd > 1 ? "s" : ""}` : "—"}</span>
                </Button>
              );
            })}
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-[17rem_minmax(0,1fr)]">
          <aside className={`${card} h-fit min-w-0 space-y-5`}>
            <h2 className="font-display text-2xl text-foreground">Minhas listas</h2>
            <ul className="space-y-2">
              {listas.map((l) => (
                <li key={l.id} className="flex items-center gap-1">
                  <Button variant="ghost"
                    onClick={() => {
                      setListaAtiva(l.id);
                      setAnuncio(`Lista "${l.nome}" selecionada.`);
                    }}
                    aria-pressed={listaAtiva === l.id}
                    className={`flex h-11 flex-1 justify-between rounded-xl px-3 text-left text-base font-bold ${
                      listaAtiva === l.id ? "bg-secondary text-secondary-foreground" : "text-foreground hover:bg-muted"
                    }`}
                  >
                    <span className="truncate">{l.nome}</span>
                    <span className="text-accent">{tarefas.filter((t) => t.listaId === l.id).length}</span>
                  </Button>
                  {l.id !== "geral" && (
                    <Button variant="ghost" size="icon" onClick={() => excluirLista(l.id)} aria-label={`Excluir lista ${l.nome}`} className="text-destructive hover:bg-destructive/10">
                      <Trash2 aria-hidden="true" />
                    </Button>
                  )}
                </li>
              ))}
            </ul>
            <form onSubmit={criarLista} aria-label="Criar lista" className="flex gap-2">
              <label htmlFor="nova-lista" className="sr-only">Nome da nova lista</label>
              <input id="nova-lista" required value={novaLista} onChange={(e) => setNovaLista(e.target.value)} placeholder="Nova lista" className={`${campo} min-w-0 flex-1 py-2`} />
              <Button type="submit" size="icon" aria-label="Adicionar lista" className="h-11 w-11 rounded-xl">
                <Plus aria-hidden="true" />
              </Button>
            </form>
            <div>
              <label htmlFor="tel" className="text-base font-bold">Celular para lembretes</label>
              <input id="tel" type="tel" autoComplete="tel" inputMode="tel" value={telefone} onChange={(e) => setTelefone(e.target.value.replace(/[^\d+]/g, ""))} placeholder="+5511999999999" className={`${campo} mt-1 w-full py-2`} />
            </div>
          </aside>

          <div className="min-w-0 space-y-5">
            <form onSubmit={adicionar} aria-label="Adicionar tarefa" className={`${card} space-y-4`}>
              <div className="flex flex-col gap-3 sm:flex-row">
                <label htmlFor="nova" className="sr-only">Nova tarefa</label>
                <input ref={campoNovaTarefa} id="nova" required value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Digite uma nova tarefa..." className={`${campo} min-w-0 flex-1`} />
                <Button type="submit" className="h-12 rounded-xl px-6 text-base font-bold">
                  <Plus aria-hidden="true" />
                  Adicionar
                </Button>
              </div>
              <div role="group" aria-labelledby="prioridade-label" className="flex flex-wrap items-center gap-2.5 text-base">
                <span id="prioridade-label" className="mr-1 font-bold">Prioridade:</span>
                {Object.keys(PRIORIDADES).map((p) => (
                  <Button variant="ghost"
                    type="button"
                    key={p}
                    onClick={() => setPrioridade(p)}
                    aria-pressed={prioridade === p}
                    className={`h-11 rounded-full border px-3 font-bold ${
                      prioridade === p
                        ? "border-primary bg-secondary text-secondary-foreground"
                        : "border-border text-foreground hover:bg-muted"
                    }`}
                  >
                    <span className={`h-2.5 w-2.5 rounded-full ${PRIORIDADES[p].cor}`} />
                    {PRIORIDADES[p].rotulo}
                  </Button>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <label htmlFor="agenda" className="flex items-center gap-2 font-bold">
                  <CalendarDays aria-hidden="true" className="h-4 w-4 text-primary" />
                  Agendar para:
                </label>
                <input id="agenda" type="datetime-local" value={agenda} onChange={(e) => setAgenda(e.target.value)} className={`${campo} min-h-11 max-w-full min-w-0 py-2`} />
                <label className="flex min-h-11 min-w-0 flex-wrap items-center gap-2">
                  <input type="checkbox" disabled={!agenda || !telefone} checked={lembrete} onChange={(e) => setLembrete(e.target.checked)} aria-describedby={!agenda || !telefone ? "sms-help" : undefined} className="h-5 w-5 accent-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" />
                  <Bell aria-hidden="true" className="h-4 w-4 text-accent" />
                  Lembrete por SMS 30 min antes
                </label>
              </div>
              {(!agenda || !telefone) && (
                <p id="sms-help" className="text-base text-muted-foreground">
                  {!agenda ? "Agende a tarefa e informe seu celular para ativar o lembrete." : 'Informe seu celular em "Minhas listas" para ativar o lembrete.'}
                </p>
              )}
              {aviso && <p role="alert" className="text-base text-destructive">{aviso}</p>}
            </form>

            <section aria-labelledby="lista-tarefas-heading" className={card}>
              <h2 id="lista-tarefas-heading" className="mb-4 font-display text-2xl text-foreground sm:text-3xl">{listas.find((l) => l.id === listaAtiva)?.nome}</h2>
              {visiveis.length === 0 ? (
                <p className="py-8 text-center text-lg text-muted-foreground">Nenhuma tarefa aqui. Adicione a primeira acima!</p>
              ) : (
                <ul className="space-y-2">
                  {visiveis.map((t) => (
                    <li key={t.id} className={`flex items-start gap-3 rounded-xl border border-l-4 bg-background p-3 sm:p-4 ${PRIORIDADES[t.prioridade].borda}`}>
                      <label className="flex min-h-11 min-w-11 shrink-0 items-start justify-center">
                            <input
                          type="checkbox"
                          checked={t.concluida}
                          onChange={(e) => {
                            const concluida = e.target.checked;
                            setTarefas((atuais) => atuais.map((x) => (x.id === t.id ? { ...x, concluida } : x)));
                            setAnuncio(`Tarefa "${t.texto}" ${concluida ? "concluída" : "marcada como pendente"}.`);
                          }}
                          aria-label={t.concluida ? `Reabrir tarefa: ${t.texto}` : `Concluir tarefa: ${t.texto}`}
                          className="mt-1 h-5 w-5 accent-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                        />
                      </label>
                      <div className="min-w-0 flex-1">
                        {tarefaEmEdicao === t.id ? (
                          <form onSubmit={salvarEdicao} className="space-y-2">
                            <label htmlFor={`titulo-${t.id}`} className="sr-only">Título da tarefa</label>
                              <input
                              id={`titulo-${t.id}`}
                              value={tituloEditado}
                              onChange={(e) => {
                                setTituloEditado(e.target.value);
                                setErroEdicao("");
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Escape") cancelarEdicao();
                              }}
                              autoFocus
                              aria-invalid={Boolean(erroEdicao)}
                              aria-describedby={erroEdicao ? `erro-${t.id}` : undefined}
                              className={`${campo} w-full min-w-0 py-2`}
                            />
                            {erroEdicao && <p id={`erro-${t.id}`} role="alert" className="text-base text-destructive">{erroEdicao}</p>}
                            <div className="flex flex-wrap gap-2">
                              <Button type="submit" size="sm" className="h-11 px-4">Salvar</Button>
                              <Button type="button" variant="outline" size="sm" onClick={cancelarEdicao} className="h-11 px-4">Cancelar</Button>
                            </div>
                          </form>
                        ) : (
                          <p className={`break-words text-lg font-bold leading-tight ${t.concluida ? "text-muted-foreground line-through" : ""}`}>{t.texto}</p>
                        )}
                        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-base text-muted-foreground">
                          <span className={`rounded-md px-2 py-0.5 text-sm font-bold ${t.concluida ? "bg-accent/15 text-accent" : "bg-muted text-muted-foreground"}`}>
                            {t.concluida ? "Concluída" : "Pendente"}
                          </span>
                          <span className="flex items-center gap-1">
                            <span className={`h-2 w-2 rounded-full ${PRIORIDADES[t.prioridade].cor}`} />
                            {PRIORIDADES[t.prioridade].rotulo}
                          </span>
                          <span>Adicionada em {fmt(t.criadaEm)}</span>
                          {t.agendadaPara && (
                            <span className="flex items-center gap-1 font-bold text-primary">
                              <CalendarDays aria-hidden="true" className="h-3.5 w-3.5" />
                              {fmt(t.agendadaPara)}
                            </span>
                          )}
                          {t.smsSid && (
                            <span className="flex items-center gap-1">
                              <Bell aria-hidden="true" className="h-3.5 w-3.5 text-accent" />
                              SMS agendado
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-col gap-1 sm:flex-row">
                        {tarefaEmEdicao !== t.id && (
                          <Button
                            ref={(element) => {
                              if (element) botoesEditar.current[t.id] = element;
                              else delete botoesEditar.current[t.id];
                            }}
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => iniciarEdicao(t)}
                            aria-label={`Editar tarefa ${t.texto}`}
                            title="Editar tarefa"
                          >
                            <Pencil aria-hidden="true" />
                          </Button>
                        )}
                        <Button variant="ghost" onClick={() => excluir(t)} className="rounded-lg px-3 py-1 text-base font-bold text-destructive hover:bg-destructive/10">
                          <Trash2 aria-hidden="true" />
                          Excluir
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </div>
      </div>
      <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">{anuncio}</p>
    </main>
  );
}
