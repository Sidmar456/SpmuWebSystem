// Labels for the turnover enums (app/Modules/Turnovers/TurnoverReason.php, ItemCondition.php).
export const REASONS = {
    no_longer_needed: 'No longer needed',
    transfer: 'Transfer to another office',
    retirement: 'Retirement or separation',
    unserviceable: 'Damaged or unserviceable',
    other: 'Other',
};

// What each turnover status means to the person returning the item.
export const TURNOVER_STATUS = {
    pending: 'For inspection',
    received: 'Received · cleared',
    rejected: 'Not accepted',
};

export const CONDITIONS = {
    serviceable: ['Serviceable', 'Still works. Goes back into stock when received.'],
    unserviceable: ['Unserviceable', 'Broken or worn out. Recorded for disposal, not added back to stock.'],
};
