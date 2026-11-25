import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Alert, BackLink, Button, Card, ErrorSummary, Field, Input, Select, Spinner, Textarea, useErrorFocus } from '../../components/ui';
import { api, errorMessage, fieldErrors, storageUrl } from '../../lib/api';
import { useApi } from '../../lib/useApi';

// Field names as shown to the user, for the error summary.
const LABELS = {
    stock_no: 'Stock / property no.',
    name: 'Item name',
    unit: 'Unit',
    category: 'Category',
    type: 'Type',
    reorder_level: 'Reorder level',
    supplier_id: 'Supplier',
    initial_quantity: 'Opening quantity',
    description: 'Specifications',
    image: 'Photo',
};

const EMPTY = { stock_no: '', name: '', description: '', unit: '', category: '', type: 'consumable', reorder_level: '0', supplier_id: '', initial_quantity: '' };

export default function ItemForm() {
    const { id } = useParams();
    const editing = !!id;
    const navigate = useNavigate();
    const existing = useApi(editing ? `/items/${id}` : null);
    const suppliers = useApi('/suppliers');
    const [form, setForm] = useState(EMPTY);
    const [image, setImage] = useState(null);
    const [errors, setErrors] = useState({});
    const [message, setMessage] = useState('');
    const [busy, setBusy] = useState(false);
    const formRef = useErrorFocus(errors);

    useEffect(() => {
        const it = existing.data?.item;
        if (!it) return;
        setForm({
            stock_no: it.stock_no,
            name: it.name,
            description: it.description ?? '',
            unit: it.unit,
            category: it.category ?? '',
            type: it.type,
            reorder_level: String(it.reorder_level),
            supplier_id: it.supplier_id ? String(it.supplier_id) : '',
            initial_quantity: '',
        });
    }, [existing.data]);

    const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

    async function submit(e) {
        e.preventDefault();
        setBusy(true);
        setErrors({});
        setMessage('');

        // Multipart so the photo can go with the fields. Empty strings become null on the server.
        const body = new FormData();
        Object.entries(form).forEach(([key, value]) => {
            if (editing && key === 'initial_quantity') return;
            body.append(key, value);
        });
        if (image) body.append('image', image);

        try {
            const res = await api.post(editing ? `/items/${id}` : '/items', body);
            navigate(`/stocks/${res.data.item.id}`);
        } catch (error) {
            const fields = fieldErrors(error);
            Object.keys(fields).length ? setErrors(fields) : setMessage(errorMessage(error));
        } finally {
            setBusy(false);
        }
    }

    if (editing && existing.loading) return <Spinner />;
    if (existing.error) return <Alert>{existing.error}</Alert>;

    return (
        <div className="space-y-4">
            <div>
                <BackLink to={editing ? `/stocks/${id}` : '/stocks'}>{editing ? 'Item details' : 'Stocks'}</BackLink>
                <h1 className="mt-1 text-xl font-semibold text-slate-900">{editing ? `Edit ${existing.data.item.name}` : 'Add item'}</h1>
            </div>

            <Card>
                <form ref={formRef} onSubmit={submit} className="space-y-4" noValidate>
                    <Alert>{message}</Alert>
                    <ErrorSummary errors={errors} labels={LABELS} />

                    <div className="grid gap-4 sm:grid-cols-2">
                        <Input label="Stock / property no." required value={form.stock_no} name="stock_no" onChange={set('stock_no')} error={errors.stock_no} />
                        <Input label="Item name" required value={form.name} name="name" onChange={set('name')} error={errors.name} />
                        <Input label="Unit" required placeholder="ream, box, piece, unit" value={form.unit} name="unit" onChange={set('unit')} error={errors.unit} />
                        <Input label="Category" placeholder="e.g. Office supplies" value={form.category} name="category" onChange={set('category')} error={errors.category} />
                        <Select
                            label="Type"
                            required
                            value={form.type}
                            name="type" onChange={set('type')}
                            error={errors.type}
                            hint={form.type === 'property' ? 'Stays with the requester and can be turned over.' : 'Used up when issued.'}
                        >
                            <option value="consumable">Consumable</option>
                            <option value="property">Property</option>
                        </Select>
                        <Input
                            label="Reorder level"
                            type="number"
                            min="0"
                            required
                            hint="Shown as low stock at or below this number."
                            value={form.reorder_level}
                            name="reorder_level" onChange={set('reorder_level')}
                            error={errors.reorder_level}
                        />
                        <Select label="Supplier" value={form.supplier_id} name="supplier_id" onChange={set('supplier_id')} error={errors.supplier_id}>
                            <option value="">No supplier</option>
                            {suppliers.data?.data.map((s) => (
                                <option key={s.id} value={s.id}>
                                    {s.name}
                                </option>
                            ))}
                        </Select>
                        {!editing && (
                            <Input
                                label="Opening quantity"
                                type="number"
                                min="0"
                                hint="Recorded on the stock card as stock in."
                                value={form.initial_quantity}
                                name="initial_quantity" onChange={set('initial_quantity')}
                                error={errors.initial_quantity}
                            />
                        )}
                    </div>

                    <Textarea
                        label="Specifications"
                        rows={4}
                        hint="Shown on the item card. One per line, e.g. Size: A4 / 80 gsm / 500 sheets per ream."
                        value={form.description}
                        name="description"
                        onChange={set('description')}
                        error={errors.description}
                    />

                    <Field label="Photo" error={errors.image} hint="JPG, PNG or WebP, up to 5 MB.">
                        {(a11y) => (
                            <div className="flex items-center gap-4">
                                {editing && existing.data.item.image_path && !image && (
                                    <img
                                        src={storageUrl(existing.data.item.image_path)}
                                        alt="Current photo"
                                        width="64"
                                        height="64"
                                        className="size-16 rounded object-cover ring-1 ring-slate-200"
                                    />
                                )}
                                <input
                                    type="file"
                                    name="image"
                                    accept="image/jpeg,image/png,image/webp"
                                    onChange={(e) => setImage(e.target.files[0] ?? null)}
                                    className="min-w-0 text-sm file:mr-3 file:min-h-11 file:cursor-pointer file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-medium hover:file:bg-slate-200 sm:file:min-h-9"
                                    {...a11y}
                                />
                            </div>
                        )}
                    </Field>

                    <div className="flex justify-end gap-2">
                        <Button variant="secondary" onClick={() => navigate(-1)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={busy}>
                            {busy ? 'Saving…' : editing ? 'Save changes' : 'Add item'}
                        </Button>
                    </div>
                </form>
            </Card>
        </div>
    );
}
