'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Trash2Icon } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import * as React from 'react';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
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
import type { InventoryVariantOptionType } from '@/types';

import { createReceivingDraftAction } from '../actions';

type InventoryProductOptionType = {
  product_id: string;
  product_label: string;
};

type ReceivingFormItemType = CreateReceivingFormInputType['items'][number];

function buildVariantLabel(option: InventoryVariantOptionType): string {
  const codes = [option.sku, option.barcode].filter(Boolean).join(' • ');
  const variantPart =
    option.variant_label.toLowerCase() === 'default'
      ? option.product_label
      : option.variant_label;

  if (!codes) return variantPart;
  return `${variantPart} (${codes})`;
}

function buildProductOptions(
  variantOptions: InventoryVariantOptionType[],
): InventoryProductOptionType[] {
  const map = new Map<string, string>();
  for (const option of variantOptions) {
    if (map.has(option.product_id)) continue;
    map.set(option.product_id, option.product_label);
  }

  return Array.from(map.entries()).map(([product_id, product_label]) => ({
    product_id,
    product_label,
  }));
}

function buildVariantOptionsByProduct(
  variantOptions: InventoryVariantOptionType[],
): Map<string, InventoryVariantOptionType[]> {
  const map = new Map<string, InventoryVariantOptionType[]>();

  for (const option of variantOptions) {
    const current = map.get(option.product_id);
    if (!current) {
      map.set(option.product_id, [option]);
      continue;
    }

    current.push(option);
  }

  return map;
}

/**
 * Resolves variant selection to stay valid for selected product.
 *
 * If current variant does not belong to the selected product, fallback to
 * the first available variant for that product.
 */
export function resolveReceivingVariantSelection(input: {
  product_id: string;
  current_variant_id: string;
  variant_options_by_product: Map<string, InventoryVariantOptionType[]>;
}): string {
  const variants = input.variant_options_by_product.get(input.product_id) ?? [];
  const hasCurrentVariant = variants.some(
    (variant) => variant.product_variant_id === input.current_variant_id,
  );

  if (hasCurrentVariant) return input.current_variant_id;
  return variants[0]?.product_variant_id ?? '';
}

function createDefaultReceivingItem(
  productOptions: InventoryProductOptionType[],
  variantOptionsByProduct: Map<string, InventoryVariantOptionType[]>,
): ReceivingFormItemType {
  const firstProductId = productOptions[0]?.product_id ?? '';
  const firstVariantId =
    variantOptionsByProduct.get(firstProductId)?.[0]?.product_variant_id ?? '';

  return {
    product_id: firstProductId,
    product_variant_id: firstVariantId,
    qty: 1,
    note: '',
  };
}

/** Multi-item receiving form (supports `DRAFT` and direct `POSTED`). */
export function CreateReceivingForm({
  variant_options,
}: {
  variant_options: InventoryVariantOptionType[];
}) {
  const router = useRouter();
  const productOptions = React.useMemo(
    () => buildProductOptions(variant_options),
    [variant_options],
  );
  const variantOptionsByProduct = React.useMemo(
    () => buildVariantOptionsByProduct(variant_options),
    [variant_options],
  );
  const defaultItem = React.useMemo(
    () => createDefaultReceivingItem(productOptions, variantOptionsByProduct),
    [productOptions, variantOptionsByProduct],
  );

  const form = useForm<CreateReceivingFormInputType>({
    resolver: zodResolver(createReceivingFormSchema),
    defaultValues: {
      status: RECEIVING_STATUS_DRAFT,
      note: '',
      items: [defaultItem],
    },
  });
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  });

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

  React.useEffect(() => {
    if (fields.length > 0) return;
    append(defaultItem);
  }, [append, defaultItem, fields.length]);

  React.useEffect(() => {
    const currentItems = form.getValues('items');
    currentItems.forEach((item, index) => {
      if (productOptions.length === 0) {
        form.setValue(`items.${index}.product_id`, '');
        form.setValue(`items.${index}.product_variant_id`, '');
        return;
      }

      const hasProduct = productOptions.some(
        (product) => product.product_id === item.product_id,
      );
      const nextProductId = hasProduct
        ? item.product_id
        : productOptions[0]!.product_id;

      if (!hasProduct) {
        form.setValue(`items.${index}.product_id`, nextProductId);
      }

      const nextVariantId = resolveReceivingVariantSelection({
        product_id: nextProductId,
        current_variant_id: item.product_variant_id,
        variant_options_by_product: variantOptionsByProduct,
      });
      if (nextVariantId === item.product_variant_id) return;

      form.setValue(`items.${index}.product_variant_id`, nextVariantId);
    });
  }, [form, productOptions, variantOptionsByProduct]);

  const handleAddItem = () => {
    if (productOptions.length === 0) {
      toast.error('Belum ada produk aktif yang bisa dipilih.');
      return;
    }

    append(createDefaultReceivingItem(productOptions, variantOptionsByProduct));
  };

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
            {/* <CardDescription>
              Pilih produk lalu varian. Varian akan menyesuaikan produk yang
              dipilih.
            </CardDescription> */}
          </CardHeader>
          <CardContent className="space-y-4">
            {fields.map((field, index) => {
              const selectedProductId = watchedItems[index]?.product_id ?? '';
              const availableVariants =
                variantOptionsByProduct.get(selectedProductId) ?? [];

              return (
                <Card key={field.id} className="gap-3 py-4">
                  <CardHeader className="px-4 pb-0">
                    <CardTitle className="text-sm">Item {index + 1}</CardTitle>
                    <CardAction>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => remove(index)}
                        disabled={isSubmitting || fields.length === 1}
                        aria-label={`Hapus item ${index + 1}`}
                        className="text-destructive hover:text-destructive"
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

                                const currentVariantId = form.getValues(
                                  `items.${index}.product_variant_id`,
                                );
                                const nextVariantId =
                                  resolveReceivingVariantSelection({
                                    product_id: nextProductId,
                                    current_variant_id: currentVariantId,
                                    variant_options_by_product:
                                      variantOptionsByProduct,
                                  });
                                if (nextVariantId === currentVariantId) return;

                                form.setValue(
                                  `items.${index}.product_variant_id`,
                                  nextVariantId,
                                  { shouldValidate: true },
                                );
                              }}
                              disabled={
                                isSubmitting || productOptions.length === 0
                              }
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Pilih produk" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {productOptions.map((option) => (
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
                                isSubmitting || availableVariants.length === 0
                              }
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Pilih varian" />
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
                                value={qtyField.value}
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
                              disabled={isSubmitting}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              );
            })}

            <Button
              type="button"
              variant="outline"
              onClick={handleAddItem}
              disabled={isSubmitting || productOptions.length === 0}
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
            disabled={productOptions.length === 0}
          >
            {submitLabel}
          </Button>
        </div>
      </form>
    </Form>
  );
}
