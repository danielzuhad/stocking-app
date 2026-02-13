'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import * as React from 'react';
import { useFieldArray, useForm, useWatch, type Path } from 'react-hook-form';
import { toast } from 'sonner';

import { ImageWithSkeleton } from '@/components/ui/image-with-skeleton';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import type { ActionResult } from '@/lib/actions/result';
import {
  PRODUCT_CATEGORY_OPTIONS,
  PRODUCT_STATUS_OPTIONS,
  productFormSchema,
  type ProductFormValuesType,
  type ProductVariantFormValueType,
} from '@/lib/validation/products';

import { createProductAction, updateProductAction } from '../actions';
import { ProductDeleteButton } from './product-delete-button';

const CATEGORY_LABELS: Record<(typeof PRODUCT_CATEGORY_OPTIONS)[number], string> = {
  FASHION: 'Fashion',
  COSMETIC: 'Cosmetic',
  GENERAL: 'General',
};

const STATUS_LABELS: Record<(typeof PRODUCT_STATUS_OPTIONS)[number], string> = {
  ACTIVE: 'Active',
  INACTIVE: 'Inactive',
};

type ImageKitUploadAuthDataType = {
  token: string;
  expire: number;
  signature: string;
  public_key: string;
  url_endpoint: string;
  folder: string;
};

/**
 * Returns empty variant input row for the dynamic variants form.
 */
function createEmptyVariant(): ProductVariantFormValueType {
  return {
    name: '',
    selling_price: 0,
    sku: '',
    barcode: '',
    is_default: false,
  };
}

/**
 * Product create/edit form with optional multi-variants and single product image.
 */
export function ProductForm({
  mode,
  product_id,
  initial_values,
}: {
  mode: 'create' | 'edit';
  product_id?: string;
  initial_values?: ProductFormValuesType;
}) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();
  const [isImageUploading, setIsImageUploading] = React.useState(false);
  const isEditMode = mode === 'edit' && Boolean(product_id);

  const form = useForm<ProductFormValuesType>({
    resolver: zodResolver(productFormSchema),
    defaultValues: initial_values ?? {
      name: '',
      category: 'GENERAL',
      unit: '',
      status: 'ACTIVE',
      image: null,
      has_variants: false,
      variants: [createEmptyVariant()],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'variants',
    keyName: 'form_key',
  });

  const watchedName = useWatch({
    control: form.control,
    name: 'name',
  });
  const watchedImage = useWatch({
    control: form.control,
    name: 'image',
  });
  const hasVariants = useWatch({
    control: form.control,
    name: 'has_variants',
  });

  React.useEffect(() => {
    if (!hasVariants) return;
    if (fields.length > 0) return;
    append({
      ...createEmptyVariant(),
      is_default: true,
    });
  }, [append, fields.length, hasVariants]);

  const uploadProductImage = React.useCallback(
    async (file: File): Promise<void> => {
      const authResponse = await fetch('/api/imagekit/auth', { method: 'POST' });
      const authResult =
        (await authResponse.json()) as ActionResult<ImageKitUploadAuthDataType>;
      if (!authResult.ok) {
        throw new Error(authResult.error.message);
      }

      const payload = new FormData();
      payload.append('file', file);
      payload.append('fileName', file.name);
      payload.append('publicKey', authResult.data.public_key);
      payload.append('signature', authResult.data.signature);
      payload.append('expire', String(authResult.data.expire));
      payload.append('token', authResult.data.token);
      payload.append('folder', authResult.data.folder);
      payload.append('useUniqueFileName', 'true');

      const uploadResponse = await fetch(
        'https://upload.imagekit.io/api/v1/files/upload',
        {
          method: 'POST',
          body: payload,
        },
      );

      const uploadResult = (await uploadResponse.json()) as {
        fileId?: string;
        url?: string;
        thumbnailUrl?: string;
        width?: number;
        height?: number;
        message?: string;
      };

      if (!uploadResponse.ok || !uploadResult.fileId || !uploadResult.url) {
        throw new Error(uploadResult.message ?? 'Upload image gagal.');
      }

      form.setValue(
        'image',
        {
          file_id: uploadResult.fileId,
          url: uploadResult.url,
          thumbnail_url: uploadResult.thumbnailUrl,
          width: uploadResult.width,
          height: uploadResult.height,
        },
        {
          shouldDirty: true,
          shouldTouch: true,
        },
      );
    },
    [form],
  );

  const handleImageFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.currentTarget.files?.[0];
    if (!file) return;

    try {
      setIsImageUploading(true);
      await uploadProductImage(file);
      toast.success('Image produk berhasil diupload.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Upload image gagal.');
    } finally {
      setIsImageUploading(false);
      event.currentTarget.value = '';
    }
  };

  const onSubmit = (values: ProductFormValuesType) => {
    startTransition(async () => {
      const result = isEditMode
        ? await updateProductAction({
            product_id,
            ...values,
          })
        : await createProductAction(values);

      if (!result.ok) {
        if (result.error.field_errors) {
          const entries = Object.entries(result.error.field_errors);
          for (const [field, messages] of entries) {
            if (!messages?.length) continue;
            form.setError(field as Path<ProductFormValuesType>, {
              message: messages[0],
            });
          }
        }

        toast.error(result.error.message);
        return;
      }

      toast.success(
        isEditMode ? 'Produk berhasil diperbarui.' : 'Produk berhasil dibuat.',
      );
      router.push('/products');
      router.refresh();
    });
  };

  const markVariantAsDefault = React.useCallback(
    (targetIndex: number) => {
      const variants = form.getValues('variants');
      variants.forEach((_, index) => {
        form.setValue(`variants.${index}.is_default`, index === targetIndex, {
          shouldDirty: true,
        });
      });
    },
    [form],
  );

  const removeVariant = React.useCallback(
    (index: number) => {
      const variants = form.getValues('variants');
      const removedVariant = variants[index];

      remove(index);

      const nextVariants = form.getValues('variants');
      if (nextVariants.length === 0) {
        append({
          ...createEmptyVariant(),
          is_default: true,
        });
        return;
      }

      if (removedVariant?.is_default || !nextVariants.some((v) => v.is_default)) {
        markVariantAsDefault(0);
      }
    },
    [append, form, markVariantAsDefault, remove],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEditMode ? 'Edit Product' : 'Create Product'}</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Nama produk</FormLabel>
                    <FormControl>
                      <Input placeholder="Contoh: Kaos Basic" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kategori</FormLabel>
                    <FormControl>
                      <select
                        value={field.value}
                        onChange={field.onChange}
                        className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
                      >
                        {PRODUCT_CATEGORY_OPTIONS.map((value) => (
                          <option key={value} value={value}>
                            {CATEGORY_LABELS[value]}
                          </option>
                        ))}
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <FormControl>
                      <select
                        value={field.value}
                        onChange={field.onChange}
                        className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
                      >
                        {PRODUCT_STATUS_OPTIONS.map((value) => (
                          <option key={value} value={value}>
                            {STATUS_LABELS[value]}
                          </option>
                        ))}
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="unit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Satuan</FormLabel>
                    <FormControl>
                      <Input placeholder="Contoh: pcs" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-3 rounded-lg border p-4">
              <div>
                <p className="text-sm font-medium">Image produk</p>
                <p className="text-muted-foreground text-xs">
                  Satu image utama per produk.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageFileChange}
                  disabled={isPending || isImageUploading}
                  className="border-input bg-background h-9 rounded-md border px-3 text-sm"
                />

                {watchedImage ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      form.setValue('image', null, {
                        shouldDirty: true,
                        shouldTouch: true,
                      })
                    }
                  >
                    Hapus image
                  </Button>
                ) : null}
              </div>

              {watchedImage ? (
                <ImageWithSkeleton
                  src={watchedImage.thumbnail_url ?? watchedImage.url}
                  alt="Product image"
                  width={480}
                  height={480}
                  className="h-40 w-full max-w-xs rounded-md object-cover"
                />
              ) : (
                <p className="text-muted-foreground text-sm">Belum ada image produk.</p>
              )}
            </div>

            <div className="space-y-3 rounded-lg border p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">Varian</p>
                  <p className="text-muted-foreground text-xs">
                    Nonaktif = produk tanpa varian eksplisit (otomatis dibuat 1
                    default variant internal).
                  </p>
                </div>

                <FormField
                  control={form.control}
                  name="has_variants"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2 space-y-0">
                      <FormLabel className="text-sm">Aktifkan multi varian</FormLabel>
                      <FormControl>
                        <input
                          type="checkbox"
                          className="accent-primary size-4"
                          checked={field.value}
                          onChange={(event) =>
                            field.onChange(event.currentTarget.checked)
                          }
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              {hasVariants ? (
                <div className="space-y-4">
                  {fields.map((variantField, index) => (
                    <div
                      key={variantField.form_key}
                      className="space-y-3 rounded-md border p-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium">Varian {index + 1}</p>
                        <div className="flex items-center gap-2">
                          {form.getValues(`variants.${index}.is_default`) ? (
                            <span className="text-muted-foreground text-xs">
                              Default
                            </span>
                          ) : null}
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => markVariantAsDefault(index)}
                          >
                            Jadikan default
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            onClick={() => removeVariant(index)}
                          >
                            Hapus
                          </Button>
                        </div>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <FormField
                          control={form.control}
                          name={`variants.${index}.name`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Nama varian</FormLabel>
                              <FormControl>
                                <Input placeholder="Contoh: Hitam - L" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name={`variants.${index}.selling_price`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Harga jual</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={field.value}
                                  onChange={(event) => {
                                    const parsedPrice = Number(
                                      event.currentTarget.value,
                                    );
                                    field.onChange(
                                      Number.isFinite(parsedPrice) ? parsedPrice : 0,
                                    );
                                  }}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name={`variants.${index}.sku`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>SKU (opsional)</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Contoh: SKU-001"
                                  value={field.value ?? ''}
                                  onChange={field.onChange}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name={`variants.${index}.barcode`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Barcode (opsional)</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Contoh: 899..."
                                  value={field.value ?? ''}
                                  onChange={field.onChange}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  ))}

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      append({
                        ...createEmptyVariant(),
                        is_default: fields.length === 0,
                      })
                    }
                  >
                    Tambah varian
                  </Button>
                </div>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Button
                  type="submit"
                  isLoading={isPending || isImageUploading}
                  loadingText="Menyimpan..."
                >
                  {isEditMode ? 'Simpan perubahan' : 'Buat product'}
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/products">Batal</Link>
                </Button>
              </div>

              {isEditMode && product_id ? (
                <ProductDeleteButton
                  product_id={product_id}
                  product_name={watchedName || 'Produk'}
                  redirect_to="/products"
                  trigger_variant="destructive"
                  trigger_size="sm"
                />
              ) : null}
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
