import { z } from "zod";

const moneyPattern = /^-?\d+(\.\d{1,2})?$/;
const digitsPattern = /^\d+$/;
const lastFourPattern = /^\d{4}$/;

const requiredText = (message: string) =>
  z.string().trim().min(1, message);

const moneyString = (message: string) =>
  z
    .string()
    .trim()
    .regex(moneyPattern, message);

const nonNegativeMoneyString = (message: string) =>
  moneyString(message).refine((value) => Number(value) >= 0, message);

const dayString = (requiredMessage: string, invalidMessage: string) =>
  z
    .string()
    .trim()
    .min(1, requiredMessage)
    .refine((value) => digitsPattern.test(value), invalidMessage)
    .refine((value) => {
      const day = Number(value);

      return Number.isInteger(day) && day >= 1 && day <= 31;
    }, invalidMessage);

const optionalLastFour = z
  .string()
  .trim()
  .refine((value) => value === "" || lastFourPattern.test(value), {
    message: "Informe exatamente 4 dígitos.",
  });

export const walletFormSchema = z.object({
  name: requiredText("Escolha um nome para identificar a carteira."),
  currencyCode: z.string().trim().length(3, "Selecione uma moeda válida."),
});

export const bankAccountFormSchema = z.object({
  name: requiredText("Informe o nome da conta."),
  institutionName: requiredText("Informe a instituição."),
  initialBalance: moneyString(
    "Use um valor numérico válido para o saldo inicial.",
  ),
});

export const creditCardFormSchema = z.object({
  name: requiredText("Informe o nome do cartão."),
  institutionName: requiredText("Informe a instituição emissora."),
  creditLimit: nonNegativeMoneyString(
    "Use um limite numérico maior ou igual a zero.",
  ),
  initialBalance: nonNegativeMoneyString(
    "Use uma dívida inicial numérica maior ou igual a zero.",
  ),
  closingDay: dayString(
    "Informe o dia de fechamento.",
    "O fechamento precisa ser um dia entre 1 e 31.",
  ),
  dueDay: dayString(
    "Informe o dia de vencimento.",
    "O vencimento precisa ser um dia entre 1 e 31.",
  ),
  lastFour: optionalLastFour,
});

export type WalletFormValues = z.infer<typeof walletFormSchema>;
export type BankAccountFormValues = z.infer<typeof bankAccountFormSchema>;
export type CreditCardFormValues = z.infer<typeof creditCardFormSchema>;

export type FormActionState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Record<string, string[]>;
};

export const INITIAL_FORM_ACTION_STATE: FormActionState = {
  status: "idle",
};

export function formDataToObject(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

export function getFieldErrors(error: z.ZodError) {
  return error.flatten().fieldErrors as Record<string, string[]>;
}
