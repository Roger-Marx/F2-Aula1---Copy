"use client";

import { useSyncExternalStore } from "react";

// Referências estáveis no módulo: recriá-las a cada render faria o React
// reinscrever o listener sem necessidade.
const subscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

/**
 * Indica se o componente já foi hidratado no cliente.
 *
 * Antes da hidratação, `onSubmit` ainda não existe, então o `preventDefault()`
 * não roda e o navegador faz o envio nativo do formulário: a página recarrega e
 * os campos digitados somem (BUG-002 / BUG-007). Manter o botão de envio
 * desabilitado no HTML servido pelo servidor impede esse envio prematuro.
 *
 * Implementado com `useSyncExternalStore` porque ele tem snapshots separados
 * para servidor e cliente: o servidor (e o primeiro render de hidratação) vê
 * `false`; depois que o React assume a página, vê `true`. Assim não há
 * divergência de hidratação nem `setState` dentro de um efeito.
 */
export function useHydrated() {
  return useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);
}
