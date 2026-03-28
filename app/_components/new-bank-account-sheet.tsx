"use client";

import { startTransition, useActionState, useEffect, useState } from "react";
import { useForm } from "@tanstack/react-form";
import { Building2Icon, PlusIcon } from "lucide-react";

import { createBankAccountAction } from "@/app/_actions/wallet-setup-actions";
import { getFirstError, toFormData } from "@/app/_components/form-utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Spinner } from "@/components/ui/spinner";
import {
  bankAccountFormSchema,
  INITIAL_FORM_ACTION_STATE,
  type BankAccountFormValues,
} from "@/lib/validation/wallet-setup";

type NewBankAccountSheetProps = {
  walletId: string;
  buttonLabel: string;
  buttonVariant?: "default" | "outline" | "secondary" | "ghost";
};

export function NewBankAccountSheet({
  walletId,
  buttonLabel,
  buttonVariant = "default",
}: NewBankAccountSheetProps) {
  const [open, setOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);

    if (!nextOpen) {
      setFormKey((current) => current + 1);
    }
  };

  return (
    <>
      <Button variant={buttonVariant} onClick={() => setOpen(true)}>
        <PlusIcon data-icon="inline-start" />
        {buttonLabel}
      </Button>
      <Sheet open={open} onOpenChange={handleOpenChange}>
        {open ? (
          <BankAccountSheetForm
            key={formKey}
            walletId={walletId}
            onSuccess={() => handleOpenChange(false)}
          />
        ) : null}
      </Sheet>
    </>
  );
}

function BankAccountSheetForm({
  walletId,
  onSuccess,
}: {
  walletId: string;
  onSuccess: () => void;
}) {
  const [state, submitAction, pending] = useActionState(
    createBankAccountAction.bind(null, walletId),
    INITIAL_FORM_ACTION_STATE,
  );

  const form = useForm({
    defaultValues: {
      name: "",
      institutionName: "",
      initialBalance: "0.00",
    } satisfies BankAccountFormValues,
    validators: {
      onSubmit: bankAccountFormSchema,
    },
    onSubmit: async ({ value }) => {
      startTransition(() => {
        submitAction(toFormData(value));
      });
    },
  });

  useEffect(() => {
    if (state.status === "success") {
      form.reset();
      onSuccess();
    }
  }, [form, onSuccess, state.status]);

  return (
    <SheetContent side="right" className="w-full sm:max-w-xl">
      <SheetHeader>
        <SheetTitle>Adicionar conta bancária</SheetTitle>
        <SheetDescription>
          Capture a instituição, o nome de exibição e o saldo inicial da conta.
        </SheetDescription>
      </SheetHeader>

      <form
        noValidate
        className="flex flex-1 flex-col gap-6 px-4 pb-4"
        onSubmit={(event) => {
          event.preventDefault();
          form.handleSubmit();
        }}
      >
        <FieldGroup>
          <form.Field
            name="name"
            children={(field) => {
              const isInvalid =
                field.state.meta.isTouched && !field.state.meta.isValid;
              const errorMessage =
                state.fieldErrors?.[field.name]?.[0] ??
                getFirstError(field.state.meta.errors);

              return (
                <Field data-invalid={isInvalid || Boolean(errorMessage)}>
                  <FieldLabel htmlFor={field.name}>Nome da conta</FieldLabel>
                  <Input
                    id={field.name}
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(event) => field.handleChange(event.target.value)}
                    aria-invalid={isInvalid || Boolean(errorMessage)}
                    placeholder="Ex.: Conta principal"
                  />
                  <FieldDescription>
                    Nome que aparecerá nos resumos e seletores do app.
                  </FieldDescription>
                  {errorMessage ? <FieldError>{errorMessage}</FieldError> : null}
                </Field>
              );
            }}
          />

          <form.Field
            name="institutionName"
            children={(field) => {
              const isInvalid =
                field.state.meta.isTouched && !field.state.meta.isValid;
              const errorMessage =
                state.fieldErrors?.[field.name]?.[0] ??
                getFirstError(field.state.meta.errors);

              return (
                <Field data-invalid={isInvalid || Boolean(errorMessage)}>
                  <FieldLabel htmlFor={field.name}>Instituição</FieldLabel>
                  <Input
                    id={field.name}
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(event) => field.handleChange(event.target.value)}
                    aria-invalid={isInvalid || Boolean(errorMessage)}
                    placeholder="Ex.: Nubank"
                  />
                  <FieldDescription>
                    Banco ou instituição financeira vinculada à conta.
                  </FieldDescription>
                  {errorMessage ? <FieldError>{errorMessage}</FieldError> : null}
                </Field>
              );
            }}
          />

          <form.Field
            name="initialBalance"
            children={(field) => {
              const isInvalid =
                field.state.meta.isTouched && !field.state.meta.isValid;
              const errorMessage =
                state.fieldErrors?.[field.name]?.[0] ??
                getFirstError(field.state.meta.errors);

              return (
                <Field data-invalid={isInvalid || Boolean(errorMessage)}>
                  <FieldLabel htmlFor={field.name}>Saldo inicial</FieldLabel>
                  <Input
                    id={field.name}
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(event) => field.handleChange(event.target.value)}
                    aria-invalid={isInvalid || Boolean(errorMessage)}
                    inputMode="decimal"
                    placeholder="0.00"
                  />
                  <FieldDescription>
                    Valor de abertura da conta no momento em que ela entra no
                    app.
                  </FieldDescription>
                  {errorMessage ? <FieldError>{errorMessage}</FieldError> : null}
                </Field>
              );
            }}
          />
        </FieldGroup>

        {state.status === "error" && state.message ? (
          <Alert variant="destructive">
            <Building2Icon />
            <AlertTitle>Não foi possível salvar a conta</AlertTitle>
            <AlertDescription>{state.message}</AlertDescription>
          </Alert>
        ) : null}

        <SheetFooter className="border-t border-border/60 px-0 pt-4">
          <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="ghost" onClick={onSuccess}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? <Spinner data-icon="inline-start" /> : <PlusIcon data-icon="inline-start" />}
              {pending ? "Salvando..." : "Salvar conta"}
            </Button>
          </div>
        </SheetFooter>
      </form>
    </SheetContent>
  );
}
