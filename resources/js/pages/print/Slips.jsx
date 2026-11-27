import { Printer } from "@phosphor-icons/react";
import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { Alert, buttonClass, formatPeso, Spinner } from "../../components/ui";
import { useAuth } from "../../lib/auth";
import { useApi } from "../../lib/useApi";
import { OUTCOMES } from "../inspections/labels";
import { AVAILABILITY } from "../procurement/labels";
import { CONDITIONS, DISPOSAL_METHODS, REASONS } from "../turnovers/labels";

const date = (value) =>
    value
        ? new Date(value).toLocaleDateString("en-PH", { dateStyle: "long" })
        : "";

/** Paper form shared by RIS and PRS: letterhead, fields, items table, signature blocks. */
function Slip({ title, number, backTo, fields, note, columns, rows, signatures }) {
    // The tab title becomes the default PDF file name when saving the print.
    useEffect(() => {
        const previous = document.title;
        document.title = `${number} · E-Supply ZPPSU`;
        return () => {
            document.title = previous;
        };
    }, [number]);

    return (
        <div className="min-h-dvh bg-slate-100 p-4 print:bg-white print:p-0">
            <div className="mx-auto mb-4 flex max-w-3xl flex-wrap justify-between gap-2 print:hidden">
                <Link to={backTo} className={buttonClass("secondary")}>
                    Back
                </Link>
                <button
                    type="button"
                    onClick={() => window.print()}
                    className={buttonClass("primary")}
                >
                    <Printer size={18} aria-hidden="true" />
                    Print
                </button>
            </div>

            <main className="mx-auto max-w-3xl bg-white p-4 text-sm sm:p-8 text-black shadow print:max-w-none print:p-0 print:shadow-none">
                <header className="text-center">
                    <img src="/images/zppsu-logo.png" alt="ZPPSU seal" width="64" height="64" className="mx-auto mb-2 size-16 object-contain" />
                    <p>Republic of the Philippines</p>
                    <p className="font-semibold">
                        Zamboanga Peninsula Polytechnic State University
                    </p>
                    <p>Supply and Property Management Unit</p>
                    <h1 className="mt-4 text-lg font-bold tracking-wide uppercase">
                        {title}
                    </h1>
                    <p className="font-mono">No. {number}</p>
                </header>

                <dl className="mt-6 grid gap-x-6 gap-y-2 sm:grid-cols-2 print:grid-cols-2">
                    {fields.map(([label, value]) => (
                        <div
                            key={label}
                            className="flex gap-2 border-b border-black/40 pb-1"
                        >
                            <dt className="shrink-0 font-semibold">{label}:</dt>
                            <dd>{value}</dd>
                        </div>
                    ))}
                </dl>

                {note && <p className="mt-6 leading-relaxed">{note}</p>}

                {/* Scrolls on a phone screen only; paper is wide enough. */}
                {rows.length > 0 && (
                <div
                    className="mt-6 overflow-x-auto"
                    tabIndex={0}
                    role="region"
                    aria-label="Items"
                >
                    <table className="w-full border-collapse">
                        <thead>
                            <tr>
                                {columns.map(([label, align]) => (
                                    <th
                                        key={label}
                                        scope="col"
                                        className={`border border-black px-2 py-1 ${align === "right" ? "text-right" : "text-left"}`}
                                    >
                                        {label}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row, i) => (
                                <tr key={i}>
                                    {row.map((cell, j) => (
                                        <td
                                            key={j}
                                            className={`border border-black px-2 py-1 ${columns[j][1] === "right" ? "text-right tabular-nums" : ""}`}
                                        >
                                            {cell}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                )}

                <div className="mt-12 grid grid-cols-2 gap-x-10 gap-y-12 break-inside-avoid">
                    {signatures.map(([role, name, when]) => (
                        <div key={role}>
                            <p className="font-semibold">{role}:</p>
                            <p className="mt-8 border-b border-black text-center">
                                {name || " "}
                            </p>
                            <p className="text-center text-xs">
                                Signature over printed name
                            </p>
                            <p className="mt-1 text-xs">
                                Date: {date(when) || "________________"}
                            </p>
                        </div>
                    ))}
                </div>
            </main>
        </div>
    );
}

export function RequestSlip() {
    const { id } = useParams();
    const { data, error, loading } = useApi(`/requests/${id}`);
    if (loading && !data) return <Spinner />;
    if (error) return <Alert>{error}</Alert>;
    const r = data.request;

    return (
        <Slip
            title="Requisition and Issue Slip"
            number={r.request_no}
            backTo={`/requests/${r.id}`}
            fields={[
                ["Office", r.office || r.user.office],
                ["Date", date(r.created_at)],
                ["Purpose", r.purpose],
                ["Status", <span className="capitalize">{r.status}</span>],
            ]}
            columns={[
                ["Stock no."],
                ["Unit"],
                ["Description"],
                ["Requested", "right"],
                ["Approved", "right"],
                ["Issued", "right"],
            ]}
            rows={r.lines.map((l) => [
                l.item.stock_no,
                l.item.unit,
                l.item.name,
                l.quantity_requested,
                l.quantity_approved ?? "",
                l.quantity_issued || "",
            ])}
            signatures={[
                ["Requested by", r.user.name, r.created_at],
                [
                    "Approved by",
                    r.status === "rejected" ? "" : r.decider?.name,
                    r.status === "rejected" ? null : r.decided_at,
                ],
                ["Issued by", r.issuer?.name, r.issued_at],
                ["Received by", r.received_by, r.issued_at],
            ]}
        />
    );
}

export function TurnoverSlip() {
    const { id } = useParams();
    const { data, error, loading } = useApi(`/turnovers/${id}`);
    if (loading && !data) return <Spinner />;
    if (error) return <Alert>{error}</Alert>;
    const t = data.turnover;
    const received = t.status === "received";

    return (
        <Slip
            title="Property Return Slip"
            number={t.turnover_no}
            backTo={`/turnovers/${t.id}`}
            fields={[
                ["Office", t.user.office],
                ["Date", date(t.created_at)],
                ["Issued through", t.line.request.request_no],
                ["Reason", REASONS[t.reason] ?? t.reason],
                ...(t.inspection ? [["Pre-inspection report", t.inspection.inspection_no]] : []),
            ]}
            columns={[
                ["Stock no."],
                ["Unit"],
                ["Description"],
                ["Quantity", "right"],
                ["Condition"],
            ]}
            rows={[
                [
                    t.line.item.stock_no,
                    t.line.item.unit,
                    t.line.item.name,
                    t.quantity,
                    CONDITIONS[t.condition]?.[0] ?? t.condition,
                ],
            ]}
            signatures={[
                ["Returned by", t.user.name, t.created_at],
                [
                    "Received by",
                    received ? t.decider?.name : "",
                    received ? t.decided_at : null,
                ],
            ]}
        />
    );
}

/** Property clearance for retirement, transfer or resignation. Cleared when nothing is under the person's name. */
export function ClearanceSlip() {
    const { id } = useParams();
    const { isAdmin } = useAuth();
    const { data, error, loading } = useApi(`/clearance/${id}`);
    if (loading && !data) return <Spinner />;
    if (error) return <Alert>{error}</Alert>;
    const { user, holdings, checked_at } = data;
    const cleared = holdings.length === 0;

    return (
        <Slip
            title={cleared ? 'Certificate of Property Clearance' : 'Property Accountability'}
            number={`CLR-${user.id}-${new Date(checked_at).toLocaleDateString("en-CA")}`} // local YYYY-MM-DD, not UTC
            backTo={isAdmin ? '/accounts' : '/turnovers'}
            fields={[
                ['Name', user.name],
                ['Office', user.office],
                ['Email', user.email],
                ['As of', date(checked_at)],
            ]}
            note={
                cleared
                    ? `This certifies that ${user.name} has no property under their name with the Supply and Property Management Unit as of ${date(checked_at)}.`
                    : `${user.name} still has the property below under their name. Clearance can be given after each item is turned over and accepted.`
            }
            columns={[['Stock / property no.'], ['Description'], ['Unit'], ['Quantity held', 'right'], ['Issued through']]}
            rows={holdings.map((l) => [l.item.stock_no, l.item.name, l.item.unit, l.quantity_issued - l.quantity_returned, l.request.request_no])}
            signatures={[
                ['Requested by', user.name, null],
                ['Certified by (Supply Officer)', '', cleared ? checked_at : null],
            ]}
        />
    );
}

/** Pre-inspection report, given to the person after the Supply Office (inspectorate) checks the equipment. */
export function InspectionSlip() {
    const { id } = useParams();
    const { data, error, loading } = useApi(`/inspections/${id}`);
    if (loading && !data) return <Spinner />;
    if (error) return <Alert>{error}</Alert>;
    const i = data.inspection;
    const [outcome, next] = OUTCOMES[i.outcome] ?? [i.outcome ?? "", ""];

    return (
        <Slip
            title="Pre-Inspection Report"
            number={i.inspection_no}
            backTo={`/inspections/${i.id}`}
            fields={[
                ["End user", i.user.name],
                ["Office", i.user.office],
                ["Date requested", date(i.created_at)],
                ["Date inspected", date(i.inspected_at)],
                ["Issued through", i.line.request.request_no],
                ["Condition found", outcome],
            ]}
            note={
                <>
                    <strong>Problem reported:</strong> {i.problem}
                    <br />
                    <strong>Findings:</strong> {i.findings}
                    <br />
                    <strong>Recommendation:</strong> {next}
                </>
            }
            columns={[["Stock / property no."], ["Description"], ["Unit"]]}
            rows={[[i.line.item.stock_no, i.line.item.name, i.line.item.unit]]}
            signatures={[
                ["Inspected by", i.inspector?.name, i.inspected_at],
                ["Received by (end user)", i.user.name, null],
            ]}
        />
    );
}

/** IIRUP for the disposal committee. Cost columns are filled in by hand: items have no unit cost yet. */
export function IirupSlip() {
    const { id } = useParams();
    const { data, error, loading } = useApi(`/iirups/${id}`);
    if (loading && !data) return <Spinner />;
    if (error) return <Alert>{error}</Alert>;
    const r = data.iirup;

    return (
        <Slip
            title="Inventory and Inspection Report of Unserviceable Property"
            number={r.iirup_no}
            backTo={`/iirups/${r.id}`}
            fields={[
                ["Date", date(r.created_at)],
                ["Items", r.turnovers.length],
                ["Disposal date", date(r.disposal_date)],
                ["Mode of disposal", DISPOSAL_METHODS[r.disposal_method] ?? ""],
            ]}
            note={r.remarks}
            columns={[["Date acquired"], ["Particulars"], ["Property no."], ["Qty", "right"], ["Unit cost", "right"], ["Total cost", "right"], ["PRS no."], ["ARE no."]]}
            rows={r.turnovers.map((t) => ["", t.line.item.name, t.line.item.stock_no, `${t.quantity} ${t.line.item.unit}`, "", "", t.turnover_no, t.are_no])}
            signatures={[
                ["Prepared by (Supply Officer)", r.creator?.name, r.created_at],
                ["Inspected by", "", null],
                ["Approved by (Disposal Committee)", "", null],
                ["Witness to disposal", "", r.disposed_on],
            ]}
        />
    );
}

/** Supplies Availability Inquiry (SAI): attached to a purchase request for items tagged not available. */
export function InquirySlip() {
    const { id } = useParams();
    const { data, error, loading } = useApi(`/inquiries/${id}`);
    if (loading && !data) return <Spinner />;
    if (error) return <Alert>{error}</Alert>;
    const q = data.inquiry;

    return (
        <Slip
            title="Supplies Availability Inquiry"
            number={q.inquiry_no}
            backTo={`/inquiries/${q.id}`}
            fields={[
                ["End user", q.user.name],
                ["Office", q.office],
                ["Date", date(q.created_at)],
                ["Purpose", q.purpose],
            ]}
            columns={[["Item and specifications"], ["Unit"], ["Quantity", "right"], ["Availability"], ["Remarks"]]}
            rows={q.lines.map((l) => [l.description, l.unit, l.quantity, AVAILABILITY[l.availability]?.[0] ?? "", l.remarks ?? ""])}
            signatures={[
                ["Requested by", q.user.name, q.created_at],
                ["Checked by (Supply Office)", q.answerer?.name, q.answered_at],
            ]}
        />
    );
}

/** Purchase Request (PR). The PR series no. prints once Procurement's step is recorded. */
export function PurchaseRequestSlip() {
    const { id } = useParams();
    const { data, error, loading } = useApi(`/purchase-requests/${id}`);
    if (loading && !data) return <Spinner />;
    if (error) return <Alert>{error}</Alert>;
    const pr = data.purchase_request;
    const total = pr.lines.reduce((sum, l) => sum + l.quantity * Number(l.unit_cost), 0);

    return (
        <Slip
            title="Purchase Request"
            number={pr.pr_no}
            backTo={`/purchase-requests/${pr.id}`}
            fields={[
                ["Office", pr.office],
                ["Date", date(pr.created_at)],
                ["Based on", pr.inquiry?.inquiry_no ?? pr.inspection?.inspection_no],
                ["PR series no.", pr.steps.find((s) => s.step === "series_assigned")?.details?.series_no ?? ""],
            ]}
            note={`Purpose: ${pr.purpose}`}
            columns={[["Unit"], ["Item description"], ["Quantity", "right"], ["Est. unit cost", "right"], ["Est. total cost", "right"]]}
            rows={[
                ...pr.lines.map((l) => [l.unit, l.description, l.quantity, formatPeso(l.unit_cost), formatPeso(l.quantity * Number(l.unit_cost))]),
                ["", "Total", "", "", formatPeso(total)],
            ]}
            signatures={[
                ["Requested by", pr.user.name, pr.created_at],
                ["Verified by (TWG)", "", null],
                ["Approved by", "", null],
            ]}
        />
    );
}

/** Inspection and Acceptance Report (IAR), from the PR's delivery and inspection. */
export function IarSlip() {
    const { id } = useParams();
    const { data, error, loading } = useApi(`/purchase-requests/${id}`);
    if (loading && !data) return <Spinner />;
    if (error) return <Alert>{error}</Alert>;
    const pr = data.purchase_request;
    const step = (name) => pr.steps.find((s) => s.step === name)?.details ?? {};

    return (
        <Slip
            title="Inspection and Acceptance Report"
            number={pr.iar_no}
            backTo={`/purchase-requests/${pr.id}`}
            fields={[
                ["Supplier", step("bid_awarded").awarded_to],
                ["PO no.", step("po_signed").po_no],
                ["Requisitioning office", pr.office],
                ["PR no.", `${pr.pr_no}${step("series_assigned").series_no ? ` (${step("series_assigned").series_no})` : ""}`],
                ["Invoice / DR no.", pr.delivery_ref],
                ["Date delivered", date(pr.delivered_on)],
            ]}
            note={pr.inspection_remarks && `Remarks: ${pr.inspection_remarks}`}
            columns={[["Unit"], ["Description"], ["Quantity delivered", "right"], ["Quantity accepted", "right"]]}
            rows={pr.lines.map((l) => [l.unit, l.description, l.quantity, l.quantity_accepted])}
            signatures={[
                ["Inspected and verified by (Inspectorate)", pr.inspector?.name, pr.inspected_on],
                ["Received and accepted by (Supply Officer)", "", pr.inspected_on],
            ]}
        />
    );
}

/** ICS (semi-expendable, below the PAR threshold) or PAR (at or above it): the lines issued on that slip. */
function PropertySlip({ kind }) {
    const { id } = useParams();
    const { data, error, loading } = useApi(`/purchase-requests/${id}`);
    if (loading && !data) return <Spinner />;
    if (error) return <Alert>{error}</Alert>;
    const pr = data.purchase_request;
    const par = kind === "par";
    const lines = pr.lines.filter((l) => l.slip === kind);
    const issuedAt = pr.item_request?.issued_at;

    return (
        <Slip
            title={par ? "Property Acknowledgement Receipt" : "Inventory Custodian Slip"}
            number={par ? pr.par_no : pr.ics_no}
            backTo={`/purchase-requests/${pr.id}`}
            fields={[
                ["Entity", "Zamboanga Peninsula Polytechnic State University"],
                ["Office", pr.office],
                ["RIS no.", pr.item_request?.request_no],
                ["Date", date(issuedAt)],
            ]}
            columns={
                par
                    ? [["Quantity", "right"], ["Unit"], ["Description"], ["Property no."], ["Date acquired"], ["Amount", "right"]]
                    : [["Quantity", "right"], ["Unit"], ["Unit cost", "right"], ["Total cost", "right"], ["Description"], ["Inventory item no."], ["Est. useful life"]]
            }
            rows={lines.map((l) =>
                par
                    ? [l.quantity_accepted, l.unit, l.item.name, l.item.stock_no, date(pr.inspected_on), formatPeso(l.quantity_accepted * Number(l.unit_cost))]
                    : [l.quantity_accepted, l.unit, formatPeso(l.unit_cost), formatPeso(l.quantity_accepted * Number(l.unit_cost)), l.item.name, l.item.stock_no, ""],
            )}
            signatures={
                par
                    ? [
                          ["Received by (end user)", pr.user.name, issuedAt],
                          ["Issued by (Supply Officer)", "", issuedAt],
                      ]
                    : [
                          ["Received from (Supply Officer)", "", issuedAt],
                          ["Received by (end user)", pr.user.name, issuedAt],
                      ]
            }
        />
    );
}

export const IcsSlip = () => <PropertySlip kind="ics" />;
export const ParSlip = () => <PropertySlip kind="par" />;
