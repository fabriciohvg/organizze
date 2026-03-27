import { eq } from "drizzle-orm";
import { db } from "../drizzle";
import { todos, Todo, InsertTodo } from "@/lib/drizzle/schema";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function getTodos(): Promise<Todo[]> {
  // await new Promise((resolve) => setTimeout(resolve, 3000));
  const allTodos = await db.select().from(todos);
  return allTodos;
}

export async function getTodoById(id: string): Promise<Todo | null> {
  if (!UUID_REGEX.test(id)) return null;

  const todo = await db.select().from(todos).where(eq(todos.id, id)).limit(1);

  return todo.length > 0 ? todo[0] : null;
}

export async function createTodo(data: InsertTodo): Promise<{ id: string }> {
  const [newTodo] = await db
    .insert(todos)
    .values(data)
    .returning({ id: todos.id });
  return newTodo;
}

export async function updateTodo(
  id: string,
  data: Partial<Omit<Todo, "id">>,
): Promise<void> {
  if (!UUID_REGEX.test(id)) return;

  await db.update(todos).set(data).where(eq(todos.id, id));
}

export async function deleteTodo(id: string): Promise<void> {
  await db.delete(todos).where(eq(todos.id, id));
}
