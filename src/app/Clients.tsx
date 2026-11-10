import { useEffect, useState } from "react";
import { clientHasInvoices, deleteClient, listClients, saveClient } from "@/lib/db";
import { emptyClient } from "@/lib/invoice-factory";
import { isValidTaxId } from "@/lib/nif";
import type { Client } from "@/lib/types";
import PartyForm from "./PartyForm";
import { Button, Card, EmptyState, PageHeader } from "./ui";
import { useLocale } from "./useLocale";

export default function ClientsView() {
  const { copy } = useLocale();
  const [clients, setClients] = useState<Client[]>([]);
  const [editing, setEditing] = useState<Client | null>(null);
  const [notice, setNotice] = useState("");

  async function refresh() {
    setClients(await listClients());
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function onSave() {
    if (!editing) return;
    if (!editing.name.trim() || !isValidTaxId(editing.nif)) return;
    await saveClient(editing);
    setEditing(null);
    await refresh();
  }

  async function onDelete(client: Client) {
    if (await clientHasInvoices(client.id)) {
      setNotice(copy.clients.used);
      return;
    }
    await deleteClient(client.id);
    await refresh();
  }

  return (
    <div>
      <PageHeader
        title={copy.clients.title}
        actions={
          <Button
            onClick={() => {
              setEditing(emptyClient());
              setNotice("");
            }}
          >
            {copy.clients.new}
          </Button>
        }
      />
      {notice ? (
        <p className="mb-4 rounded-xl bg-warn/10 px-4 py-2 text-sm" role="status">
          {notice}
        </p>
      ) : null}
      {editing ? (
        <Card className="mb-6">
          <PartyForm party={editing} copy={copy} idPrefix="edit-client" onChange={(party) => setEditing({ ...editing, ...party })} />
          <div className="mt-4 flex gap-2">
            <Button onClick={() => void onSave()}>{copy.clients.save}</Button>
            <Button variant="ghost" onClick={() => setEditing(null)}>
              {copy.cancel}
            </Button>
          </div>
        </Card>
      ) : null}
      {!clients.length && !editing ? (
        <EmptyState title={copy.clients.title} body={copy.clients.empty} />
      ) : (
        <div className="grid gap-3">
          {clients.map((client) => (
            <Card key={client.id} className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold">{client.name}</p>
                <p className="text-sm text-mute">
                  {client.nif} · {client.address.city}
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setEditing(client)}>
                  {copy.editor.titleEdit}
                </Button>
                <Button variant="danger" onClick={() => void onDelete(client)}>
                  {copy.clients.delete}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
