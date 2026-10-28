import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";
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
  const [carregado, setCarregado] = useState(false);
  const [tarefaEmEdicao, setTarefaEmEdicao] = useState(null);
  const [tituloEditado, setTituloEditado] = useState("");
  const [erroEdicao, setErroEdicao] = useState("");

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
    cancelarEdicao();
  };

  const excluir = (t) => {
    if (tarefaEmEdicao === t.id) cancelarEdicao();
    if (t.smsSid) cancelarSms({ data: { sid: t.smsSid } }).catch(() => {});
    setTarefas((p) => p.filter((x) => x.id !== t.id));
  };

  const criarLista = (e) => {
    e.preventDefault();
    const n = novaLista.trim();
    if (!n) return;
    const id = String(Date.now());
    setListas([...listas, { id, nome: n }]);
    setListaAtiva(id);
    setNovaLista("");
  };

  const excluirLista = (id) => {
    tarefas.filter((t) => t.listaId === id).forEach(excluir);
    setListas(listas.filter((l) => l.id !== id));
    setListaAtiva("geral");
  };

  const ordem = { alta: 0, media: 1, baixa: 2 };
  const visiveis = tarefas
    .filter((t) => t.listaId === listaAtiva)
    .filter((t) => !diaFiltro || (t.agendadaPara && mesmoDia(new Date(t.agendadaPara), new Date(diaFiltro))))
    .sort((a, b) => Number(a.concluida) - Number(b.concluida) || ordem[a.prioridade] - ordem[b.prioridade]);

  const concluidas = tarefas.filter((t) => t.concluida).length;
  const card = "rounded-2xl bg-card p-5 shadow-card";
  const campo = "rounded-xl border border-input bg-background px-4 py-3 outline-none focus:ring-2 focus:ring-primary";

  return (
    <main className="min-h-screen bg-background px-4 py-10 font-sans">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="text-center">
          <h1 className="text-3xl font-extrabold text-primary sm:text-4xl">Meu Organizador de Estudos</h1>
          <p className="mt-2 text-muted-foreground">
            Olá, estudante! Que bom ter você aqui. Vamos organizar seus estudos juntos? 📚
          </p>
        </header>

        <section className="grid grid-cols-2 gap-4">
          <div className={`${card} text-center`}>
            <p className="text-3xl font-extrabold text-primary">{tarefas.length}</p>
            <p className="text-sm text-muted-foreground">Tarefas cadastradas</p>
          </div>
          <div className={`${card} text-center`}>
            <p className="text-3xl font-extrabold text-primary">{concluidas}</p>
            <p className="text-sm text-muted-foreground">Tarefas concluídas</p>
          </div>
        </section>

        <section className={card}>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold">Esta semana</h2>
            {diaFiltro && (
              <Button variant="ghost" onClick={() => setDiaFiltro(null)} className="text-sm font-semibold text-primary">
                Ver todos os dias
              </Button>
            )}
          </div>
          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {semana.map((d) => {
              const hoje = mesmoDia(d, new Date());
              const ativo = diaFiltro && mesmoDia(d, new Date(diaFiltro));
              const qtd = tarefas.filter((t) => t.agendadaPara && mesmoDia(new Date(t.agendadaPara), d)).length;
              return (
                <Button variant="ghost"
                  key={d.toISOString()}
                  onClick={() => setDiaFiltro(ativo ? null : d.toISOString())}
                  className={`rounded-xl border p-2 text-center transition ${
                    ativo ? "border-primary bg-primary text-primary-foreground" : hoje ? "border-primary" : "border-border hover:bg-muted"
                  }`}
                >
                  <span className="block text-xs font-semibold">{DIAS[d.getDay()]}</span>
                  <span className="block text-lg font-extrabold">{d.getDate()}</span>
                  <span className="block text-[10px] opacity-80">{qtd ? `${qtd} tarefa${qtd > 1 ? "s" : ""}` : "—"}</span>
                </Button>
              );
            })}
          </div>
        </section>

        <div className="grid gap-6 md:grid-cols-[240px_1fr]">
          <aside className={`${card} h-fit space-y-4`}>
            <h2 className="text-lg font-bold">Minhas listas</h2>
            <ul className="space-y-1">
              {listas.map((l) => (
                <li key={l.id} className="flex items-center gap-1">
                  <Button variant="ghost"
                    onClick={() => setListaAtiva(l.id)}
                    className={`flex flex-1 justify-between rounded-lg px-3 py-2 text-left text-sm font-semibold ${
                      listaAtiva === l.id ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                    }`}
                  >
                    <span className="truncate">{l.nome}</span>
                    <span>{tarefas.filter((t) => t.listaId === l.id).length}</span>
                  </Button>
                  {l.id !== "geral" && (
                    <Button variant="ghost" onClick={() => excluirLista(l.id)} aria-label={`Excluir lista ${l.nome}`} className="px-2 text-destructive">
                      ×
                    </Button>
                  )}
                </li>
              ))}
            </ul>
            <form onSubmit={criarLista} className="flex gap-2">
              <input value={novaLista} onChange={(e) => setNovaLista(e.target.value)} placeholder="Nova lista" className={`${campo} min-w-0 flex-1 py-2 text-sm`} />
              <Button variant="ghost" className="rounded-xl bg-primary px-3 font-bold text-primary-foreground">+</Button>
            </form>
            <div>
              <label htmlFor="tel" className="text-sm font-semibold">Celular para lembretes</label>
              <input id="tel" value={telefone} onChange={(e) => setTelefone(e.target.value.replace(/[^\d+]/g, ""))} placeholder="+5511999999999" className={`${campo} mt-1 w-full py-2 text-sm`} />
            </div>
          </aside>

          <div className="space-y-6">
            <form onSubmit={adicionar} className={`${card} space-y-3`}>
              <div className="flex flex-col gap-3 sm:flex-row">
                <label htmlFor="nova" className="sr-only">Nova tarefa</label>
                <input id="nova" value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Digite uma nova tarefa..." className={`${campo} min-w-0 flex-1`} />
                <Button variant="ghost" type="submit" className="rounded-xl bg-primary px-6 py-3 font-bold text-primary-foreground transition hover:opacity-90">
                  Adicionar
                </Button>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <span className="font-semibold">Prioridade:</span>
                {Object.keys(PRIORIDADES).map((p) => (
                  <Button variant="ghost"
                    type="button"
                    key={p}
                    onClick={() => setPrioridade(p)}
                    className={`flex items-center gap-1.5 rounded-full border px-3 py-1 font-semibold ${prioridade === p ? "border-primary bg-muted" : "border-border"}`}
                  >
                    <span className={`h-2.5 w-2.5 rounded-full ${PRIORIDADES[p].cor}`} />
                    {PRIORIDADES[p].rotulo}
                  </Button>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <label htmlFor="agenda" className="font-semibold">Agendar para:</label>
                <input id="agenda" type="datetime-local" value={agenda} onChange={(e) => setAgenda(e.target.value)} className={`${campo} max-w-full min-w-0 py-2`} />
                <label className={`flex items-center gap-2 ${!agenda || !telefone ? "opacity-50" : ""}`}>
                  <input type="checkbox" disabled={!agenda || !telefone} checked={lembrete} onChange={(e) => setLembrete(e.target.checked)} className="h-4 w-4 accent-primary" />
                  Lembrete por SMS 30 min antes
                </label>
              </div>
              {!telefone && agenda && <p className="text-xs text-muted-foreground">Informe seu celular em "Minhas listas" para ativar o lembrete.</p>}
              {aviso && <p className="text-sm text-destructive">{aviso}</p>}
            </form>

            <section className={card}>
              <h2 className="mb-4 text-lg font-bold">{listas.find((l) => l.id === listaAtiva)?.nome}</h2>
              {visiveis.length === 0 ? (
                <p className="py-6 text-center text-muted-foreground">Nenhuma tarefa aqui. Adicione a primeira acima!</p>
              ) : (
                <ul className="space-y-2">
                  {visiveis.map((t) => (
                    <li key={t.id} className={`flex items-start gap-3 rounded-xl border border-l-4 border-border p-3 ${PRIORIDADES[t.prioridade].borda}`}>
                      <input
                        type="checkbox"
                        checked={t.concluida}
                        onChange={() => setTarefas(tarefas.map((x) => (x.id === t.id ? { ...x, concluida: !x.concluida } : x)))}
                        aria-label="Marcar como concluída"
                        className="mt-1 h-5 w-5 accent-primary"
                      />
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
                            {erroEdicao && <p id={`erro-${t.id}`} role="alert" className="text-sm text-destructive">{erroEdicao}</p>}
                            <div className="flex flex-wrap gap-2">
                              <Button type="submit" size="sm">Salvar</Button>
                              <Button type="button" variant="outline" size="sm" onClick={cancelarEdicao}>Cancelar</Button>
                            </div>
                          </form>
                        ) : (
                          <p className={`break-words font-semibold ${t.concluida ? "text-muted-foreground line-through" : ""}`}>{t.texto}</p>
                        )}
                        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <span className={`h-2 w-2 rounded-full ${PRIORIDADES[t.prioridade].cor}`} />
                            {PRIORIDADES[t.prioridade].rotulo}
                          </span>
                          <span>Adicionada em {fmt(t.criadaEm)}</span>
                          {t.agendadaPara && <span className="font-semibold text-primary">📅 {fmt(t.agendadaPara)}</span>}
                          {t.smsSid && <span>🔔 SMS agendado</span>}
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-col gap-1 sm:flex-row">
                        {tarefaEmEdicao !== t.id && (
                          <Button type="button" variant="ghost" size="icon" onClick={() => iniciarEdicao(t)} aria-label={`Editar tarefa ${t.texto}`} title="Editar tarefa">
                            <Pencil />
                          </Button>
                        )}
                      <Button variant="ghost" onClick={() => excluir(t)} className="rounded-lg px-3 py-1 text-sm font-semibold text-destructive hover:bg-destructive/10">
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
    </main>
  );
}
