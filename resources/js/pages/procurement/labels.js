// Labels for app/Modules/Procurement/InquiryStatus.php and Availability.php.
export const INQUIRY_STATUS = {
    pending: 'Waiting for answer',
    answered: 'Answered',
};

export const AVAILABILITY = {
    available: ['Available', 'In stock. Request it from Stocks.'],
    not_available: ['Not available', 'None in stock. You may prepare a purchase request.'],
};

export const PR_STATUS = {
    submitted: 'In process',
    returned: 'Returned for corrections',
    ordered: 'PO signed',
    delivered: 'Delivered',
    inspected: 'Inspected (IAR)',
    issued: 'Issued',
};

/**
 * Office steps, in order (app/Modules/Procurement/PrStep.php).
 * [step, label, who records it, extra fields [name, label, type]], canReturn
 */
export const PR_STEPS = [
    ['twg_verified', 'TWG verified', 'admin', [], true],
    ['series_assigned', 'PR series no. assigned', 'admin', [['series_no', 'PR series no.', 'text']]],
    ['bac_validated', 'BAC validated', 'validator', [], true],
    ['bid_awarded', 'Bid awarded', 'validator', [['awarded_to', 'Awarded to (supplier)', 'text'], ['award_amount', 'Award amount (₱)', 'number']]],
    ['burs_certified', 'BURS certified (Budget)', 'admin', []],
    ['funds_certified', 'Funds certified (Accounting)', 'admin', []],
    ['contract_approved', 'Contract approved (OP)', 'admin', []],
    ['po_signed', 'PO signed by supplier', 'admin', [['po_no', 'PO no.', 'text']]],
];
