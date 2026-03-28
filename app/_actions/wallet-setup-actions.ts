"use server";

import { revalidatePath } from "next/cache";

import {
  createBankAccount,
  createCreditCard,
  createWallet,
} from "@/lib/drizzle/queries";
import {
  bankAccountFormSchema,
  creditCardFormSchema,
  formDataToObject,
  getFieldErrors,
  type FormActionState,
  walletFormSchema,
} from "@/lib/validation/wallet-setup";

export async function createWalletAction(
  _previousState: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const parsedValues = walletFormSchema.safeParse(formDataToObject(formData));

  if (!parsedValues.success) {
    return {
      status: "error",
      message: "Revise os campos da carteira.",
      fieldErrors: getFieldErrors(parsedValues.error),
    };
  }

  try {
    await createWallet(parsedValues.data);
    revalidatePath("/");

    return {
      status: "success",
      message: "Carteira criada com sucesso.",
    };
  } catch {
    return {
      status: "error",
      message: "Não foi possível criar a carteira agora.",
    };
  }
}

export async function createBankAccountAction(
  walletId: string,
  _previousState: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  if (!walletId) {
    return {
      status: "error",
      message: "Nenhuma carteira ativa foi encontrada para essa conta.",
    };
  }

  const parsedValues = bankAccountFormSchema.safeParse(formDataToObject(formData));

  if (!parsedValues.success) {
    return {
      status: "error",
      message: "Revise os campos da conta bancária.",
      fieldErrors: getFieldErrors(parsedValues.error),
    };
  }

  try {
    await createBankAccount({
      walletId,
      ...parsedValues.data,
    });
    revalidatePath("/");

    return {
      status: "success",
      message: "Conta bancária criada com sucesso.",
    };
  } catch {
    return {
      status: "error",
      message: "Não foi possível salvar a conta bancária agora.",
    };
  }
}

export async function createCreditCardAction(
  walletId: string,
  _previousState: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  if (!walletId) {
    return {
      status: "error",
      message: "Nenhuma carteira ativa foi encontrada para esse cartão.",
    };
  }

  const parsedValues = creditCardFormSchema.safeParse(formDataToObject(formData));

  if (!parsedValues.success) {
    return {
      status: "error",
      message: "Revise os campos do cartão de crédito.",
      fieldErrors: getFieldErrors(parsedValues.error),
    };
  }

  try {
    await createCreditCard({
      walletId,
      name: parsedValues.data.name,
      institutionName: parsedValues.data.institutionName,
      creditLimit: parsedValues.data.creditLimit,
      initialBalance: parsedValues.data.initialBalance,
      closingDay: Number(parsedValues.data.closingDay),
      dueDay: Number(parsedValues.data.dueDay),
      ...(parsedValues.data.lastFour
        ? { lastFour: parsedValues.data.lastFour }
        : {}),
    });
    revalidatePath("/");

    return {
      status: "success",
      message: "Cartão de crédito criado com sucesso.",
    };
  } catch {
    return {
      status: "error",
      message: "Não foi possível salvar o cartão de crédito agora.",
    };
  }
}
