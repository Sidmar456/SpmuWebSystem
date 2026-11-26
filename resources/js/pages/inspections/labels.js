// Labels for the inspection enums (app/Modules/Inspections/InspectionStatus.php, InspectionOutcome.php).
export const INSPECTION_STATUS = {
    requested: 'Requested',
    scheduled: 'Scheduled',
    inspected: 'Inspected',
    cancelled: 'Cancelled',
};

// [label, what happens next] for each condition found at pre-inspection.
export const OUTCOMES = {
    unserviceable: ['Unserviceable', 'Cannot be fixed. Turn the item over to the Supply Office.'],
    replacement: ['For replacement', 'Needs a replacement unit or part. Prepare a purchase request with this report.'],
    repair: ['Requires repair', 'Can be repaired. Prepare a purchase request for parts or consumables with this report.'],
    recoverable: ['Recoverable', 'Usable parts can be recovered. Prepare a purchase request with this report.'],
};
