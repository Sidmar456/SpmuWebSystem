import { Printer } from "@phosphor-icons/react";
import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { Alert, buttonClass, Spinner } from "../../components/ui";
import { useAuth } from "../../lib/auth";
import { useApi } from "../../lib/useApi";
import { CONDITIONS, REASONS } from "../turnovers/labels";

const date = (value) =>
    value
        ? new Date(value).toLocaleDateString("en-PH", { dateStyle: "long" })
        : "";

/** Paper form shared by RIS and PRS: letterhead, fields, items table, signature blocks. */
function Slip({ title, number, backTo, fields, note, columns, rows, signatures }) {
    // The tab title becomes the default PDF file name when saving the print.
    useEffect(() => {
        const previous = document.title;
        document.title = `${number} · SPMU IMS`;
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
