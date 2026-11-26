import axios from 'axios';

// Same origin as Laravel: the session cookie is sent automatically, and axios copies the
// XSRF-TOKEN cookie into the X-XSRF-TOKEN header, which Laravel's CSRF check accepts.
export const api = axios.create({
    baseURL: '/api',
    headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
});

/** Field errors from a Laravel 422 response, as { field: 'first message' }. */
export function fieldErrors(error) {
    const errors = error?.response?.data?.errors ?? {};
    return Object.fromEntries(Object.entries(errors).map(([field, messages]) => [field, messages[0]]));
}

/**
 * Split a failed request into errors for this form's own fields (`fields` are names or prefixes, e.g. 'lines')
 * and one message for anything the form cannot show next to a field.
 */
export function formErrors(error, fields) {
    const all = fieldErrors(error);
    const own = (key) => fields.some((name) => key === name || key.startsWith(`${name}.`));
    const errors = Object.fromEntries(Object.entries(all).filter(([key]) => own(key)));
    const other = Object.entries(all).find(([key]) => !own(key));
    return { errors, message: other ? other[1] : Object.keys(errors).length ? '' : errorMessage(error) };
}

/** One readable message for any failed request. */
export function errorMessage(error) {
    const status = error?.response?.status;
    if (status === 419) return 'Your session expired. Please reload the page.';
    if (status === 403) return 'You are not allowed to do that.';
    if (status === 429) return 'Too many attempts. Please wait a minute and try again.';
    return error?.response?.data?.message || 'Something went wrong. Please try again.';
}

/** Public URL of a file on Laravel's "public" disk (needs `php artisan storage:link`). */
export const storageUrl = (path) => (path ? `/storage/${path}` : null);
