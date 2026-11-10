import type { Party } from "@/lib/types";
import { personKindFromTaxId, validateTaxId } from "@/lib/nif";
import type { Copy } from "./ui";
import { Field, Input, Select } from "./ui";

export default function PartyForm({
  party,
  copy,
  onChange,
  idPrefix,
}: {
  party: Party;
  copy: Copy;
  onChange: (party: Party) => void;
  idPrefix: string;
}) {
  const nif = validateTaxId(party.nif);
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label={copy.clients.name}>
        <Input
          id={`${idPrefix}-name`}
          value={party.name}
          onChange={(event) => onChange({ ...party, name: event.target.value })}
          autoComplete="organization"
        />
      </Field>
      <Field label={copy.clients.nif} error={party.nif && !nif.ok ? copy.invalidNif : undefined}>
        <Input
          id={`${idPrefix}-nif`}
          value={party.nif}
          onChange={(event) => {
            const nifValue = event.target.value;
            onChange({ ...party, nif: nifValue, kind: personKindFromTaxId(nifValue) });
          }}
          aria-invalid={Boolean(party.nif) && !nif.ok}
        />
      </Field>
      <Field label={copy.party.kind}>
        <Select
          value={party.kind}
          onChange={(event) => onChange({ ...party, kind: event.target.value as Party["kind"] })}
        >
          <option value="individual">{copy.party.individual}</option>
          <option value="company">{copy.party.company}</option>
        </Select>
      </Field>
      <Field label={copy.party.email}>
        <Input
          type="email"
          value={party.email ?? ""}
          onChange={(event) => onChange({ ...party, email: event.target.value })}
        />
      </Field>
      <Field label={copy.party.address}>
        <Input
          value={party.address.line1}
          onChange={(event) => onChange({ ...party, address: { ...party.address, line1: event.target.value } })}
        />
      </Field>
      <Field label={copy.party.postalCode}>
        <Input
          value={party.address.postalCode}
          onChange={(event) => onChange({ ...party, address: { ...party.address, postalCode: event.target.value } })}
        />
      </Field>
      <Field label={copy.party.city}>
        <Input
          value={party.address.city}
          onChange={(event) => onChange({ ...party, address: { ...party.address, city: event.target.value } })}
        />
      </Field>
      <Field label={copy.party.province}>
        <Input
          value={party.address.province}
          onChange={(event) => onChange({ ...party, address: { ...party.address, province: event.target.value } })}
        />
      </Field>
      <Field label={copy.party.phone}>
        <Input
          value={party.phone ?? ""}
          onChange={(event) => onChange({ ...party, phone: event.target.value })}
        />
      </Field>
    </div>
  );
}
