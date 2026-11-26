import { formatDateTime } from '../../components/ui';
import { OUTCOMES } from './labels';

const day = (value) => (value ? new Date(`${value}T00:00:00`).toLocaleDateString('en-PH', { dateStyle: 'medium' }) : '');

/**
 * Steps of the office flow for returning equipment (END USER.docx): pre-inspection, turnover,
 * unserviceable stockroom, IIRUP, disposal. Either side may be missing.
 */
export function propertySteps({ inspection: i, turnover: t }) {
    const steps = [];
    if (i) {
        steps.push(
            { label: 'Requested', done: true, detail: formatDateTime(i.created_at) },
            { label: 'Scheduled', done: !!i.scheduled_for || i.status === 'inspected', detail: day(i.scheduled_for) },
            { label: 'Inspected', done: i.status === 'inspected', detail: i.outcome ? `${OUTCOMES[i.outcome][0]} · ${formatDateTime(i.inspected_at)}` : '' },
        );
        if (i.outcome && i.outcome !== 'unserviceable') {
            const pr = i.purchase_requests?.[0];
            return [...steps, { label: 'Purchase request', done: !!pr, detail: pr ? `${pr.pr_no} · ${formatDateTime(pr.created_at)}` : 'Prepared by the end user' }];
        }
    }

    const received = t?.status === 'received';
    steps.push(
        { label: 'Turned over', done: !!t, detail: t ? `${t.turnover_no} · ${formatDateTime(t.created_at)}` : '' },
        { label: 'Received', done: received, detail: received ? formatDateTime(t.decided_at) : '' },
    );
    // Serviceable returns end here: the item is back in stock.
    if (i || t?.condition === 'unserviceable') {
        steps.push(
            { label: 'In stockroom', done: !!t?.are_no, detail: t?.are_no ? `ARE ${t.are_no}` : '' },
            { label: 'IIRUP', done: !!t?.iirup, detail: t?.iirup?.iirup_no ?? '' },
            { label: 'Disposed', done: t?.iirup?.status === 'disposed', detail: day(t?.iirup?.disposed_on) },
        );
    }
    return steps;
}
