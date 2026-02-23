'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Trash2Icon } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import * as React from 'react';
import {
  useFieldArray,
  useForm,
  useWatch,
  type UseFormReturn,
} from 'react-hook-form';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { NumberInput } from '@/components/ui/number-input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  RECEIVING_STATUS_DRAFT,
  RECEIVING_STATUS_LABELS,
  RECEIVING_STATUS_POSTED,
} from '@/lib/inventory/enums';
import {
  createReceivingFormSchema,
  type CreateReceivingFormInputType,
} from '@/lib/validation/inventory';
import type {
  InventoryProductOptionType,
  InventoryVariantOptionType,
} from '@/types';

import {
  createReceivingDraftAction,
  fetchReceivingVariantOptionsByProductAction,
} from '../actions';

type ReceivingFormItemType = CreateReceivingFormInputType['items'][number];
type VariantOptionsByProductType = Record<string, InventoryVariantOptionType[]>;

function buildVariantLabel(option: InventoryVariantOptionType): string {
  const codes = [option.sku, option.barcode].filter(Boolean).join(' • ');
  const variantPart =
    option.variant_label.toLowerCase() === 'default'
      ? option.product_label
      : option.variant_label;

  if (!codes) return variantPart;
  return `${variantPart} (${codes})`;
}

/**
 * Keeps variant selection only if it still belongs to selected product.
 *
 * If current variant does not belong to selected product, keep it empty so
 * user must choose variant explicitly.
 */
export function resolveReceivingVariantSelection(input: {
  current_variant_id: string;
  variants: InventoryVariantOptionType[];
}): string {
  const hasCurrentVariant = input.variants.some(
    (variant) => variant.product_variant_id === input.current_variant_id,
  );

  if (hasCurrentVariant) return input.current_variant_id;
  return '';
}

/**
 * Ensures product + variant pair stays valid against available catalog.
 */
function sanitizeReceivingItemSelection(input: {
  item: ReceivingFormItemType;
  available_product_ids: Set<string>;
  variant_options_by_product: VariantOptionsByProductType;
}): Pick<ReceivingFormItemType, 'product_id' | 'product_variant_id'> {
  if (!input.item.product_id) {
    return {
      product_id: '',
      product_variant_id: '',
    };
  }

  if (!input.available_product_ids.has(input.item.product_id)) {
    return {
      product_id: '',
      product_variant_id: '',
    };
  }

  const availableVariants =
    input.variant_options_by_product[input.item.product_id] ?? [];

  return {
    product_id: input.item.product_id,
    product_variant_id: resolveReceivingVariantSelection({
      current_variant_id: input.item.product_variant_id,
      variants: availableVariants,
    }),
  };
}

function createDefaultReceivingItem(): ReceivingFormItemType {
  return {
    product_id: '',
    product_variant_id: '',
    qty: 0,
    note: '',
  };
}

type ReceivingItemRowPropsType = {
  index: number;
  form: UseFormReturn<CreateReceivingFormInputType>;
  product_options: InventoryProductOptionType[];
  variant_options_by_product: VariantOptionsByProductType;
  loading_variants_by_product: Record<string, boolean>;
  is_submitting: boolean;
  can_remove: boolean;
  on_remove: (index: number) => void;
  on_product_change: (input: {
    index: number;
    next_product_id: string;
  }) => void;
};

function ReceivingItemRow({
  index,
  form,
  product_options,
  variant_options_by_product,
  loading_variants_by_product,
  is_submitting,
  can_remove,
  on_remove,
  on_product_change,
}: ReceivingItemRowPropsType) {
  const selectedProductId =
    useWatch({
      control: form.control,
      name: `items.${index}.product_id`,
    }) ?? '';
  const availableVariants = variant_options_by_product[selectedProductId] ?? [];
  const isVariantLoading = Boolean(
    selectedProductId && loading_variants_by_product[selectedProductId],
  );

  return (
    <Card className="gap-3 py-4">
      <CardHeader className="px-4 pb-0">
        <CardTitle className="text-sm">Item {index + 1}</CardTitle>
        <CardAction>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => on_remove(index)}
            disabled={is_submitting || !can_remove}
            aria-label={`Hapus item ${index + 1}`}
            className="text-destructive hover:text-destructive border"
          >
            <Trash2Icon className="size-4" />
          </Button>
        </CardAction>
      </CardHeader>

      <CardContent className="space-y-3 px-4">
        <div className="grid gap-3 md:grid-cols-[1fr_1fr_180px]">
          <FormField
            control={form.control}
            name={`items.${index}.product_id`}
            render={({ field: productField }) => (
              <FormItem>
                <FormLabel>Produk</FormLabel>
                <Select
                  value={productField.value}
                  onValueChange={(nextProductId) => {
                    productField.onChange(nextProductId);
                    on_product_change({
                      index,
                      next_product_id: nextProductId,
                    });
                  }}
                  disabled={is_submitting || product_options.length === 0}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih produk" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {product_options.map((option) => (
                      <SelectItem
                        key={option.product_id}
                        value={option.product_id}
                      >
                        {option.product_label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name={`items.${index}.product_variant_id`}
            render={({ field: variantField }) => (
              <FormItem>
                <FormLabel>Varian</FormLabel>
                <Select
                  value={variantField.value}
                  onValueChange={variantField.onChange}
                  disabled={
                    is_submitting ||
                    !selectedProductId ||
                    isVariantLoading ||
                    availableVariants.length === 0
                  }
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          isVariantLoading ? 'Memuat varian...' : 'Pilih varian'
                        }
                      />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {availableVariants.map((option) => (
                      <SelectItem
                        key={option.product_variant_id}
                        value={option.product_variant_id}
                      >
                        {buildVariantLabel(option)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name={`items.${index}.qty`}
            render={({ field: qtyField }) => (
              <FormItem>
                <FormLabel>Qty</FormLabel>
                <FormControl>
                  <NumberInput
                    value={qtyField.value === 0 ? undefined : qtyField.value}
                    placeholder="0"
                    onBlur={qtyField.onBlur}
                    onValueChange={qtyField.onChange}
                    decimalScale={2}
                    allowNegative={false}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name={`items.${index}.note`}
          render={({ field: noteField }) => (
            <FormItem>
              <FormLabel>Catatan Item (opsional)</FormLabel>
              <FormControl>
                <Input
                  value={noteField.value ?? ''}
                  onChange={noteField.onChange}
                  placeholder="Catatan item"
                  disabled={is_submitting}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  );
}

/** Multi-item receiving form (supports `DRAFT` and direct `POSTED`). */
export function CreateReceivingForm({
  product_options,
}: {
  product_options: InventoryProductOptionType[];
}) {
  const router = useRouter();
  const defaultItem = React.useMemo(() => createDefaultReceivingItem(), []);

  const form = useForm<CreateReceivingFormInputType>({
    resolver: zodResolver(createReceivingFormSchema),
    defaultValues: {
      status: RECEIVING_STATUS_POSTED,
      note: '',
      items: [defaultItem],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  });

  const [variantOptionsByProduct, setVariantOptionsByProduct] =
    React.useState<VariantOptionsByProductType>({});
  const [loadingVariantsByProduct, setLoadingVariantsByProduct] =
    React.useState<Record<string, boolean>>({});
  const variantOptionsByProductRef = React.useRef(variantOptionsByProduct);
  const loadingVariantRequestsRef = React.useRef(new Set<string>());

  React.useEffect(() => {
    variantOptionsByProductRef.current = variantOptionsByProduct;
  }, [variantOptionsByProduct]);

  const selectedStatus =
    useWatch({ control: form.control, name: 'status' }) ??
    RECEIVING_STATUS_DRAFT;
  const watchedItems = useWatch({ control: form.control, name: 'items' }) ?? [];
  const isSubmitting = form.formState.isSubmitting;

  const totalQty = watchedItems.reduce(
    (total, item) => total + Number(item?.qty ?? 0),
    0,
  );

  const submitLabel =
    selectedStatus === RECEIVING_STATUS_POSTED
      ? 'Simpan & Posting'
      : 'Simpan Draf';
  const loadingText =
    selectedStatus === RECEIVING_STATUS_POSTED
      ? 'Menyimpan dan posting...'
      : 'Menyimpan draf...';

  const availableProductIds = React.useMemo(
    () => new Set(product_options.map((product) => product.product_id)),
    [product_options],
  );

  const setVariantLoadingState = React.useCallback(
    (product_id: string, is_loading: boolean) => {
      setLoadingVariantsByProduct((current) => {
        if (is_loading) {
          if (current[product_id]) return current;
          return {
            ...current,
            [product_id]: true,
          };
        }

        if (!current[product_id]) return current;
        const { [product_id]: _removed, ...next } = current;
        return next;
      });
    },
    [],
  );

  const ensureVariantsLoaded = React.useCallback(
    async (product_id: string) => {
      if (!product_id) return;
      if (variantOptionsByProductRef.current[product_id]) return;
      if (loadingVariantRequestsRef.current.has(product_id)) return;

      loadingVariantRequestsRef.current.add(product_id);
      setVariantLoadingState(product_id, true);

      try {
        const result = await fetchReceivingVariantOptionsByProductAction({
          product_id,
        });
        if (!result.ok) {
          toast.error(result.error.message);
          return;
        }

        setVariantOptionsByProduct((current) => {
          if (current[product_id]) return current;

          const next = {
            ...current,
            [product_id]: result.data,
          };
          variantOptionsByProductRef.current = next;
          return next;
        });
      } finally {
        loadingVariantRequestsRef.current.delete(product_id);
        setVariantLoadingState(product_id, false);
      }
    },
    [setVariantLoadingState],
  );

  React.useEffect(() => {
    if (fields.length > 0) return;
    append(defaultItem);
  }, [append, defaultItem, fields.length]);

  React.useEffect(() => {
    const currentItems = form.getValues('items');

    currentItems.forEach((item, index) => {
      const sanitized = sanitizeReceivingItemSelection({
        item,
        available_product_ids: availableProductIds,
        variant_options_by_product: variantOptionsByProduct,
      });

      if (sanitized.product_id !== item.product_id) {
        form.setValue(`items.${index}.product_id`, sanitized.product_id);
      }

      if (sanitized.product_variant_id !== item.product_variant_id) {
        form.setValue(
          `items.${index}.product_variant_id`,
          sanitized.product_variant_id,
        );
      }
    });
  }, [availableProductIds, form, variantOptionsByProduct]);

  const handleAddItem = React.useCallback(() => {
    if (product_options.length === 0) {
      toast.error('Belum ada produk aktif yang bisa dipilih.');
      return;
    }

    append(createDefaultReceivingItem());
  }, [append, product_options.length]);

  const handleProductChange = React.useCallback(
    (input: { index: number; next_product_id: string }) => {
      const currentItem =
        form.getValues(`items.${input.index}`) ?? createDefaultReceivingItem();
      const sanitized = sanitizeReceivingItemSelection({
        item: {
          ...currentItem,
          product_id: input.next_product_id,
          product_variant_id: '',
        },
        available_product_ids: availableProductIds,
        variant_options_by_product: variantOptionsByProductRef.current,
      });

      form.setValue(
        `items.${input.index}.product_variant_id`,
        sanitized.product_variant_id,
        { shouldValidate: false },
      );
      form.clearErrors(`items.${input.index}.product_variant_id`);

      if (sanitized.product_variant_id) return;
      void ensureVariantsLoaded(input.next_product_id);
    },
    [availableProductIds, ensureVariantsLoaded, form],
  );

  const onSubmit = async (values: CreateReceivingFormInputType) => {
    const result = await createReceivingDraftAction({
      status: values.status,
      note: values.note,
      items: values.items.map((item) => ({
        product_variant_id: item.product_variant_id,
        qty: item.qty,
        note: item.note,
      })),
    });

    if (!result.ok) {
      toast.error(result.error.message);
      return;
    }

    toast.success(
      result.data.status === RECEIVING_STATUS_POSTED
        ? 'Barang masuk berhasil dibuat dan diposting.'
        : 'Draf barang masuk berhasil dibuat.',
    );

    router.push('/inventory/receivings');
    router.refresh();
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-4"
        aria-busy={isSubmitting}
      >
        <Card className="gap-2">
          <CardHeader>
            <CardTitle className="text-base">Item Penerimaan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {fields.map((field, index) => {
              return (
                <ReceivingItemRow
                  key={field.id}
                  index={index}
                  form={form}
                  product_options={product_options}
                  variant_options_by_product={variantOptionsByProduct}
                  loading_variants_by_product={loadingVariantsByProduct}
                  is_submitting={isSubmitting}
                  can_remove={fields.length > 1}
                  on_remove={remove}
                  on_product_change={handleProductChange}
                />
              );
            })}

            <Button
              type="button"
              variant="outline"
              onClick={handleAddItem}
              disabled={isSubmitting || product_options.length === 0}
            >
              Tambah Item
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Dokumen Penerimaan</CardTitle>
            <CardDescription>
              Pilih status, isi catatan, lalu tambahkan item barang masuk.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={isSubmitting}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={RECEIVING_STATUS_DRAFT}>
                          {RECEIVING_STATUS_LABELS[RECEIVING_STATUS_DRAFT]}
                        </SelectItem>
                        <SelectItem value={RECEIVING_STATUS_POSTED}>
                          {RECEIVING_STATUS_LABELS[RECEIVING_STATUS_POSTED]}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="rounded-md border px-3 py-2">
                <div className="text-muted-foreground text-xs">Ringkasan</div>
                <div className="text-sm font-medium">
                  {fields.length} item • Total Qty{' '}
                  {Number(totalQty).toLocaleString('id-ID')}
                </div>
              </div>
            </div>

            <FormField
              control={form.control}
              name="note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Catatan Dokumen (opsional)</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={2}
                      value={field.value ?? ''}
                      onChange={field.onChange}
                      placeholder="No. faktur supplier / catatan dokumen"
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            asChild
            disabled={isSubmitting}
          >
            <Link href="/inventory/receivings">Batal</Link>
          </Button>
          <Button
            type="submit"
            isLoading={isSubmitting}
            loadingText={loadingText}
            disabled={product_options.length === 0}
          >
            {submitLabel}
          </Button>
        </div>
      </form>
    </Form>
  );
}
