import { invoiceTotals, lineBase } from "./calc";
import { isoToFacturaeDate } from "./format";
import { normalizeTaxId, personKindFromTaxId } from "./nif";
import { round2 } from "./money";
import type { Invoice, Party } from "./types";

function xmlEscape(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function money(value: number, digits = 2): string {
  return round2(value).toFixed(digits);
}

function personType(party: Party): "F" | "J" {
  return personKindFromTaxId(party.nif) === "company" || party.kind === "company" ? "J" : "F";
}

function partyXml(party: Party, tag: "SellerParty" | "BuyerParty"): string {
  const type = personType(party);
  const nif = normalizeTaxId(party.nif);
  const identity =
    type === "J"
      ? `<LegalEntity>
          <CorporateName>${xmlEscape(party.name.slice(0, 80))}</CorporateName>
          ${party.tradeName ? `<TradeName>${xmlEscape(party.tradeName.slice(0, 40))}</TradeName>` : ""}
          <AddressInSpain>
            <Address>${xmlEscape(party.address.line1.slice(0, 80))}</Address>
            <PostCode>${xmlEscape(party.address.postalCode.slice(0, 5).padStart(5, "0"))}</PostCode>
            <Town>${xmlEscape(party.address.city.slice(0, 50))}</Town>
            <Province>${xmlEscape(party.address.province.slice(0, 20))}</Province>
            <CountryCode>ESP</CountryCode>
          </AddressInSpain>
        </LegalEntity>`
      : `<Individual>
          <Name>${xmlEscape(givenName(party.name))}</Name>
          <FirstSurname>${xmlEscape(surname(party.name))}</FirstSurname>
          <AddressInSpain>
            <Address>${xmlEscape(party.address.line1.slice(0, 80))}</Address>
            <PostCode>${xmlEscape(party.address.postalCode.slice(0, 5).padStart(5, "0"))}</PostCode>
            <Town>${xmlEscape(party.address.city.slice(0, 50))}</Town>
            <Province>${xmlEscape(party.address.province.slice(0, 20))}</Province>
            <CountryCode>ESP</CountryCode>
          </AddressInSpain>
        </Individual>`;

  return `<${tag}>
      <TaxIdentification>
        <PersonTypeCode>${type}</PersonTypeCode>
        <ResidenceTypeCode>R</ResidenceTypeCode>
        <TaxIdentificationNumber>${xmlEscape(nif)}</TaxIdentificationNumber>
      </TaxIdentification>
      ${identity}
    </${tag}>`;
}

function givenName(name: string): string {
  const parts = name.trim().split(/\s+/);
  return (parts[0] || name).slice(0, 40);
}

function surname(name: string): string {
  const parts = name.trim().split(/\s+/);
  return (parts.slice(1).join(" ") || name).slice(0, 40);
}

export function buildFacturaeXml(invoice: Invoice): string {
  const totals = invoiceTotals(invoice);
  const issue = isoToFacturaeDate(invoice.issueDate);
  const operation = isoToFacturaeDate(invoice.operationDate);
  const documentType = invoice.type === "rectificativa" ? "OR" : "FC";
  const classCode = invoice.type === "rectificativa" ? "OR" : "OO";
  const items = invoice.lines
    .map((line, index) => {
      const base = lineBase(line);
      const recargoRate = line.recargo ? (line.ivaRate === 21 ? 5.2 : line.ivaRate === 10 ? 1.4 : line.ivaRate === 4 ? 0.5 : 0) : 0;
      return `<InvoiceLine>
            <ItemDescription>${xmlEscape(line.description.slice(0, 2500))}</ItemDescription>
            <Quantity>${line.quantity.toFixed(2)}</Quantity>
            <UnitOfMeasure>01</UnitOfMeasure>
            <UnitPriceWithoutTax>${money(line.unitPrice, 6)}</UnitPriceWithoutTax>
            <TotalCost>${money(base, 6)}</TotalCost>
            <GrossAmount>${money(base, 6)}</GrossAmount>
            <TaxesOutputs>
              <Tax>
                <TaxTypeCode>01</TaxTypeCode>
                <TaxRate>${money(line.ivaRate)}</TaxRate>
                <TaxableBase>
                  <TotalAmount>${money(base)}</TotalAmount>
                </TaxableBase>
                <TaxAmount>
                  <TotalAmount>${money((base * line.ivaRate) / 100)}</TotalAmount>
                </TaxAmount>
                ${
                  recargoRate
                    ? `<EquivalenceSurcharge>${money(recargoRate)}</EquivalenceSurcharge>
                <EquivalenceSurchargeAmount>
                  <TotalAmount>${money((base * recargoRate) / 100)}</TotalAmount>
                </EquivalenceSurchargeAmount>`
                    : ""
                }
              </Tax>
            </TaxesOutputs>
            <LineItemPeriod>
              <StartDate>${operation}</StartDate>
              <EndDate>${operation}</EndDate>
            </LineItemPeriod>
            <IssuerTransactionReference>${xmlEscape(invoice.number || `LINE-${index + 1}`)}</IssuerTransactionReference>
          </InvoiceLine>`;
    })
    .join("\n          ");

  const taxes = totals.buckets
    .filter((bucket) => bucket.base !== 0 || bucket.iva !== 0)
    .map(
      (bucket) => `<Tax>
              <TaxTypeCode>01</TaxTypeCode>
              <TaxRate>${money(bucket.ivaRate)}</TaxRate>
              <TaxableBase>
                <TotalAmount>${money(bucket.base)}</TotalAmount>
              </TaxableBase>
              <TaxAmount>
                <TotalAmount>${money(bucket.iva)}</TotalAmount>
              </TaxAmount>
              ${
                bucket.recargoRate
                  ? `<EquivalenceSurcharge>${money(bucket.recargoRate)}</EquivalenceSurcharge>
              <EquivalenceSurchargeAmount>
                <TotalAmount>${money(bucket.recargo)}</TotalAmount>
              </EquivalenceSurchargeAmount>`
                  : ""
              }
            </Tax>`,
    )
    .join("\n            ");

  const withheld =
    totals.irpfAmount !== 0
      ? `<TaxesWithheld>
            <Tax>
              <TaxTypeCode>04</TaxTypeCode>
              <TaxRate>${money(totals.irpfRate)}</TaxRate>
              <TaxableBase>
                <TotalAmount>${money(totals.subtotal)}</TotalAmount>
              </TaxableBase>
              <TaxAmount>
                <TotalAmount>${money(totals.irpfAmount)}</TotalAmount>
              </TaxAmount>
            </Tax>
          </TaxesWithheld>`
      : "";

  const corrective =
    invoice.type === "rectificativa"
      ? `<Corrective>
            <InvoiceNumber>${xmlEscape(invoice.rectifiesNumber || "")}</InvoiceNumber>
            <ReasonCode>16</ReasonCode>
            <ReasonDescription>${xmlEscape((invoice.rectificationReason || "Rectificación").slice(0, 2500))}</ReasonDescription>
            <TaxPeriod>
              <StartDate>${operation}</StartDate>
              <EndDate>${operation}</EndDate>
            </TaxPeriod>
            <CorrectionMethod>01</CorrectionMethod>
            <CorrectionMethodDescription>Rectificación íntegra</CorrectionMethodDescription>
          </Corrective>`
      : "";

  const taxOutputs = money(add(totals.ivaTotal, totals.recargoTotal));

  return `<?xml version="1.0" encoding="UTF-8"?>
<!-- UNSIGNED Facturae 3.2.2 generated by Factura Libre. Not a qualified electronic invoice. Not for FACe until signed. -->
<fe:Facturae xmlns:fe="http://www.facturae.gob.es/formato/Versiones/Facturaev3_2_2.xml">
  <FileHeader>
    <SchemaVersion>3.2.2</SchemaVersion>
    <Modality>I</Modality>
    <InvoiceIssuerType>EM</InvoiceIssuerType>
    <Batch>
      <BatchIdentifier>${xmlEscape(normalizeTaxId(invoice.issuer.nif) + invoice.number)}</BatchIdentifier>
      <InvoicesCount>1</InvoicesCount>
      <TotalInvoicesAmount>
        <TotalAmount>${money(totals.total)}</TotalAmount>
      </TotalInvoicesAmount>
      <TotalOutstandingAmount>
        <TotalAmount>${money(totals.total)}</TotalAmount>
      </TotalOutstandingAmount>
      <TotalExecutableAmount>
        <TotalAmount>${money(totals.total)}</TotalAmount>
      </TotalExecutableAmount>
      <InvoiceCurrencyCode>EUR</InvoiceCurrencyCode>
    </Batch>
  </FileHeader>
  <Parties>
    ${partyXml(invoice.issuer, "SellerParty")}
    ${partyXml(invoice.client, "BuyerParty")}
  </Parties>
  <Invoices>
    <Invoice>
      <InvoiceHeader>
        <InvoiceNumber>${xmlEscape(invoice.number || invoice.id)}</InvoiceNumber>
        <InvoiceSeriesCode>${xmlEscape(seriesCodeOf(invoice))}</InvoiceSeriesCode>
        <InvoiceDocumentType>${documentType}</InvoiceDocumentType>
        <InvoiceClass>${classCode}</InvoiceClass>
        ${corrective}
      </InvoiceHeader>
      <InvoiceIssueData>
        <IssueDate>${issue}</IssueDate>
        <OperationDate>${operation}</OperationDate>
        <PlaceOfIssue>
          <PostCode>${xmlEscape(invoice.issuer.address.postalCode.slice(0, 5).padStart(5, "0"))}</PostCode>
          <PlaceOfIssueDescription>${xmlEscape(invoice.issuer.address.city.slice(0, 20))}</PlaceOfIssueDescription>
        </PlaceOfIssue>
        <InvoiceCurrencyCode>EUR</InvoiceCurrencyCode>
        <TaxCurrencyCode>EUR</TaxCurrencyCode>
        <LanguageName>es</LanguageName>
      </InvoiceIssueData>
      <TaxesOutputs>
        ${taxes}
      </TaxesOutputs>
      ${withheld}
      <InvoiceTotals>
        <TotalGrossAmount>${money(totals.subtotal)}</TotalGrossAmount>
        <TotalGeneralDiscounts>0.00</TotalGeneralDiscounts>
        <TotalGeneralSurcharges>0.00</TotalGeneralSurcharges>
        <TotalGrossAmountBeforeTaxes>${money(totals.subtotal)}</TotalGrossAmountBeforeTaxes>
        <TotalTaxOutputs>${taxOutputs}</TotalTaxOutputs>
        <TotalTaxesWithheld>${money(totals.irpfAmount)}</TotalTaxesWithheld>
        <InvoiceTotal>${money(totals.total)}</InvoiceTotal>
        <TotalOutstandingAmount>${money(totals.total)}</TotalOutstandingAmount>
        <TotalExecutableAmount>${money(totals.total)}</TotalExecutableAmount>
      </InvoiceTotals>
      <Items>
        ${items}
      </Items>
      ${
        invoice.notes
          ? `<AdditionalData>
        <InvoiceAdditionalInformation>${xmlEscape(invoice.notes.slice(0, 2500))}

Facturae 3.2.2 SIN FIRMAR generado con Factura Libre.</InvoiceAdditionalInformation>
      </AdditionalData>`
          : `<AdditionalData>
        <InvoiceAdditionalInformation>Facturae 3.2.2 SIN FIRMAR generado con Factura Libre.</InvoiceAdditionalInformation>
      </AdditionalData>`
      }
    </Invoice>
  </Invoices>
</fe:Facturae>
`;
}

function add(a: number, b: number): number {
  return round2(a + b);
}

function seriesCodeOf(invoice: Invoice): string {
  const match = invoice.number.match(/^([A-Za-z]+)-\d{4}-\d+$/);
  return match?.[1] ?? "";
}

export function facturaeFilename(invoice: Invoice): string {
  const number = (invoice.number || "borrador").replaceAll(/[^\w.-]/g, "_");
  return `facturae-sin-firmar-${number}.xml`;
}
