import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/sms.functions", () => ({
  agendarSms: vi.fn(),
  cancelarSms: vi.fn(),
}));

import { Index } from "@/routes/index";

const tarefa = {
  id: 123,
  texto: "Estudar matemática",
  concluida: false,
  criadaEm: "2026-10-28T18:00:00.000Z",
  prioridade: "alta",
  listaId: "geral",
  agendadaPara: "2026-10-29T18:00:00.000Z",
};

function editar() {
  fireEvent.click(screen.getByRole("button", { name: "Editar tarefa Estudar matemática" }));
  return screen.getByRole("textbox", { name: "Título da tarefa" });
}

function tarefasSalvas() {
  return JSON.parse(localStorage.getItem("tarefas"));
}

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem("tarefas", JSON.stringify([tarefa]));
  render(<Index />);
});

afterEach(cleanup);

describe("Edição de tarefas", () => {
  it("salva o novo título sem alterar os outros dados", () => {
    fireEvent.change(editar(), { target: { value: "  Revisar álgebra  " } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));
    expect(tarefasSalvas()).toEqual([{ ...tarefa, texto: "Revisar álgebra" }]);
  });

  it.each(["", "   "])("não salva título vazio ou somente espaços: %j", (titulo) => {
    fireEvent.change(editar(), { target: { value: titulo } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));
    expect(tarefasSalvas()).toEqual([tarefa]);
    expect(screen.getByRole("textbox", { name: "Título da tarefa" })).toBeInTheDocument();
  });

  it("mantém o título anterior ao cancelar", () => {
    fireEvent.change(editar(), { target: { value: "Descartar alteração" } });
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(tarefasSalvas()).toEqual([tarefa]);
    fireEvent.click(screen.getByRole("button", { name: "Editar tarefa Estudar matemática" }));
    expect(screen.getByRole("textbox", { name: "Título da tarefa" })).toHaveValue(tarefa.texto);
  });

  it("preserva adicionar, concluir e excluir tarefas", () => {
    fireEvent.change(screen.getByRole("textbox", { name: "Nova tarefa" }), { target: { value: "Ler capítulo" } });
    fireEvent.click(screen.getByRole("button", { name: "Adicionar" }));
    expect(tarefasSalvas()).toHaveLength(2);
    const linha = screen.getByText("Ler capítulo").closest("li");
    expect(linha).not.toBeNull();
    fireEvent.click(within(linha).getByRole("checkbox"));
    expect(tarefasSalvas().find((item) => item.texto === "Ler capítulo").concluida).toBe(true);
    fireEvent.click(within(linha).getByRole("button", { name: "Excluir" }));
    expect(tarefasSalvas()).toEqual([tarefa]);
  });
});