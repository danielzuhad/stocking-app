'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { ImagePlusIcon, InfoIcon } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import * as React from 'react';
import { useFieldArray, useForm, useWatch, type Path } from 'react-hook-form';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DeleteButton } from '@/components/ui/delete-button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { ImagePreviewDialog } from '@/components/ui/image-preview-dialog';
import { Input } from '@/components/ui/input';
import { NumberInput } from '@/components/ui/number-input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import type { ActionResult } from '@/lib/actions/result';
import {
  PRODUCT_CATEGORY_LABELS,
  PRODUCT_DEFAULT_STATUS,
  PRODUCT_DEFAULT_UNIT,
  PRODUCT_STATUS_LABELS,
  PRODUCT_UNIT_LABELS,
} from '@/lib/products/enums';
import { buildImageKitTransformUrl, toSafeSlugSegment } from '@/lib/utils';
import {
  createEmptyProductVariant,
  isProductVariantBlank,
  normalizeProductFormPayload,
  PRODUCT_CATEGORY_OPTIONS,
  PRODUCT_LOCKED_CATEGORY,
  PRODUCT_STATUS_OPTIONS,
  PRODUCT_UNIT_OPTIONS,
  productFormSchema,
  type ProductFormValuesType,
} from '@/lib/validation/products';

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  createProductAction,
  deleteProductAction,
  updateProductAction,
} from '../actions';

const ALLOWED_PRODUCT_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;
const MAX_PRODUCT_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const MIN_PRODUCT_IMAGE_DIMENSION_PX = 120;
const MAX_PRODUCT_IMAGE_DIMENSION_PX = 6000;
const MAX_PRODUCT_IMAGE_UPLOAD_DIMENSION_PX = 2000;
const PRODUCT_IMAGE_WEBP_QUALITY = 0.82;
const IMAGE_MIME_EXTENSION_MAP = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
} as const;

type ImageKitUploadAuthDataType = {
  token: string;
  expire: number;
  signature: string;
  public_key: string;
  url_endpoint: string;
  folder: string;
  company_tag: string;
};
type ProductImageValueType = NonNullable<ProductFormValuesType['image']>;
type ImageKitUploadResponseType = {
  fileId?: string;
  url?: string;
  thumbnailUrl?: string;
  width?: number;
  height?: number;
  message?: string;
};

/**
 * Structured ImageKit upload error with HTTP status context.
 */
class ImageKitUploadError extends Error {
  status: number;
  response: ImageKitUploadResponseType;

  constructor(
    message: string,
    options: {
      status: number;
      response: ImageKitUploadResponseType;
    },
  ) {
    super(message);
    this.name = 'ImageKitUploadError';
    this.status = options.status;
    this.response = options.response;
  }
}

/**
 * Builds deterministic file name from product name for ImageKit uploads.
 */
function buildProductImageFileName(productName: string, file: File): string {
  const productNameSlug = toSafeSlugSegment(productName);
  const fallbackNameSlug = toSafeSlugSegment(file.name.replace(/\.[^.]+$/, ''));
  const baseName = productNameSlug || fallbackNameSlug || 'product-image';

  const extensionFromName = (() => {
    const lastDotIndex = file.name.lastIndexOf('.');
    if (lastDotIndex < 0 || lastDotIndex === file.name.length - 1) return null;
    return file.name.slice(lastDotIndex + 1).toLowerCase();
  })();
  const extensionFromMime =
    IMAGE_MIME_EXTENSION_MAP[
      file.type as keyof typeof IMAGE_MIME_EXTENSION_MAP
    ];
  const extension = extensionFromName || extensionFromMime;

  return extension ? `${baseName}.${extension}` : baseName;
}

/**
 * Splits `name.ext` into base and extension for suffix retries.
 */
function splitFileNameParts(fileName: string): {
  base_name: string;
  extension: string | null;
} {
  const lastDotIndex = fileName.lastIndexOf('.');
  if (lastDotIndex < 1 || lastDotIndex === fileName.length - 1) {
    return {
      base_name: fileName,
      extension: null,
    };
  }

  return {
    base_name: fileName.slice(0, lastDotIndex),
    extension: fileName.slice(lastDotIndex + 1),
  };
}

/**
 * Generates duplicate-safe filename using `_2`, `_3`, ... suffix.
 */
function buildDuplicateIndexedFileName(
  fileName: string,
  duplicateIndex: number,
): string {
  if (duplicateIndex <= 1) return fileName;

  const parts = splitFileNameParts(fileName);
  const suffix = `_${duplicateIndex}`;
  if (!parts.extension) return `${parts.base_name}${suffix}`;

  return `${parts.base_name}${suffix}.${parts.extension}`;
}

/**
 * Detects upload conflict caused by existing filename on ImageKit.
 */
function isImageKitFileNameConflictError(error: unknown): boolean {
  if (error instanceof ImageKitUploadError) {
    if (error.status === 409) return true;
    return /exists|already|duplicate|conflict|same name/i.test(error.message);
  }

  if (error instanceof Error) {
    return /exists|already|duplicate|conflict|same name/i.test(error.message);
  }

  return false;
}

/**
 * Loads image object from temporary blob URL.
 */
function loadImageFromObjectUrl(objectUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Gagal membaca file gambar.'));
    image.src = objectUrl;
  });
}

/**
 * Reads image dimensions without uploading to server.
 */
async function readImageDimensions(file: File): Promise<{
  width: number;
  height: number;
}> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await loadImageFromObjectUrl(objectUrl);
    return {
      width: image.naturalWidth,
      height: image.naturalHeight,
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

/**
 * Uploads file to ImageKit with real-time progress callback.
 */
function uploadImageKitFileWithProgress(
  payload: FormData,
  onProgress: (progress: number) => void,
): Promise<ImageKitUploadResponseType> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open('POST', 'https://upload.imagekit.io/api/v1/files/upload');

    request.upload.onprogress = (event) => {
      if (!event.lengthComputable) return;
      const progress = Math.min(
        100,
        Math.max(0, Math.round((event.loaded / event.total) * 100)),
      );
      onProgress(progress);
    };

    request.onerror = () => {
      reject(new Error('Gagal menghubungkan ke server upload.'));
    };

    request.onload = () => {
      try {
        const parsedResponse = JSON.parse(
          request.responseText,
        ) as ImageKitUploadResponseType;
        if (request.status < 200 || request.status >= 300) {
          reject(
            new ImageKitUploadError(
              parsedResponse.message ?? 'Upload foto gagal.',
              {
                status: request.status,
                response: parsedResponse,
              },
            ),
          );
          return;
        }
        onProgress(100);
        resolve(parsedResponse);
      } catch {
        reject(new Error('Gagal membaca respons upload image.'));
      }
    };

    request.send(payload);
  });
}

/**
 * Optimizes image client-side (resize + convert to WebP) before upload.
 */
async function optimizeImageBeforeUpload(file: File): Promise<File> {
  const { width, height } = await readImageDimensions(file);
  const scale = Math.min(
    1,
    MAX_PRODUCT_IMAGE_UPLOAD_DIMENSION_PX / width,
    MAX_PRODUCT_IMAGE_UPLOAD_DIMENSION_PX / height,
  );
  const targetWidth = Math.max(1, Math.round(width * scale));
  const targetHeight = Math.max(1, Math.round(height * scale));

  const shouldResize = targetWidth !== width || targetHeight !== height;
  const shouldConvertToWebp = file.type !== 'image/webp';
  if (!shouldResize && !shouldConvertToWebp) return file;

  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await loadImageFromObjectUrl(objectUrl);
    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const context = canvas.getContext('2d');
    if (!context) return file;

    context.drawImage(image, 0, 0, targetWidth, targetHeight);

    const webpBlob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/webp', PRODUCT_IMAGE_WEBP_QUALITY);
    });
    if (!webpBlob) return file;

    const fileNameBase = file.name.replace(/\.[^.]+$/, '');
    return new File([webpBlob], `${fileNameBase || 'product-image'}.webp`, {
      type: 'image/webp',
      lastModified: Date.now(),
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

/**
 * Validates selected image file before upload.
 */
function validateImageFile(
  file: File,
  dimensions?: { width: number; height: number },
): void {
  if (
    !ALLOWED_PRODUCT_IMAGE_MIME_TYPES.includes(
      file.type as (typeof ALLOWED_PRODUCT_IMAGE_MIME_TYPES)[number],
    )
  ) {
    throw new Error('File harus berupa gambar.');
  }

  if (file.size > MAX_PRODUCT_IMAGE_SIZE_BYTES) {
    throw new Error('Ukuran gambar maksimal 5MB.');
  }

  if (!dimensions) return;

  if (
    dimensions.width < MIN_PRODUCT_IMAGE_DIMENSION_PX ||
    dimensions.height < MIN_PRODUCT_IMAGE_DIMENSION_PX
  ) {
    throw new Error(
      `Dimensi gambar minimal ${MIN_PRODUCT_IMAGE_DIMENSION_PX}x${MIN_PRODUCT_IMAGE_DIMENSION_PX}px.`,
    );
  }

  if (
    dimensions.width > MAX_PRODUCT_IMAGE_DIMENSION_PX ||
    dimensions.height > MAX_PRODUCT_IMAGE_DIMENSION_PX
  ) {
    throw new Error(
      `Dimensi gambar maksimal ${MAX_PRODUCT_IMAGE_DIMENSION_PX}x${MAX_PRODUCT_IMAGE_DIMENSION_PX}px.`,
    );
  }
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
  const [imageUploadProgress, setImageUploadProgress] = React.useState(0);
  const [pendingImageFile, setPendingImageFile] = React.useState<File | null>(
    null,
  );
  const [pendingImagePreviewUrl, setPendingImagePreviewUrl] = React.useState<
    string | null
  >(null);
  const isEditMode = mode === 'edit' && Boolean(product_id);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const form = useForm<ProductFormValuesType>({
    resolver: zodResolver(productFormSchema),
    defaultValues: initial_values ?? {
      name: '',
      category: PRODUCT_LOCKED_CATEGORY,
      unit: PRODUCT_DEFAULT_UNIT,
      status: PRODUCT_DEFAULT_STATUS,
      image: null,
      has_variants: false,
      variants: [createEmptyProductVariant({ is_default: true })],
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
  const watchedVariants = useWatch({
    control: form.control,
    name: 'variants',
  });

  const clearPendingImage = React.useCallback(() => {
    setPendingImageFile(null);
    setPendingImagePreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return null;
    });
  }, []);

  React.useEffect(() => {
    return () => {
      setPendingImagePreviewUrl((current) => {
        if (current) URL.revokeObjectURL(current);
        return null;
      });
    };
  }, []);

  React.useEffect(() => {
    if (fields.length > 0) return;
    append(createEmptyProductVariant({ is_default: true }));
  }, [append, fields.length]);

  React.useEffect(() => {
    const variants = watchedVariants ?? [];
    const hasMeaningfulVariant = variants.some(
      (variant) => !isProductVariantBlank(variant),
    );
    const currentHasVariants = form.getValues('has_variants');
    if (currentHasVariants === hasMeaningfulVariant) return;

    form.setValue('has_variants', hasMeaningfulVariant, {
      shouldDirty: false,
      shouldTouch: false,
    });
  }, [form, watchedVariants]);

  const uploadProductImage = React.useCallback(
    async (file: File, productName: string): Promise<ProductImageValueType> => {
      const authResponse = await fetch('/api/imagekit/auth', {
        method: 'POST',
      });
      const authResult =
        (await authResponse.json()) as ActionResult<ImageKitUploadAuthDataType>;
      if (!authResult.ok) {
        throw new Error(authResult.error.message);
      }

      const preferredFileName = buildProductImageFileName(productName, file);

      for (let duplicateIndex = 1; duplicateIndex <= 20; duplicateIndex += 1) {
        const payload = new FormData();
        payload.append('file', file);
        payload.append(
          'fileName',
          buildDuplicateIndexedFileName(preferredFileName, duplicateIndex),
        );
        payload.append('publicKey', authResult.data.public_key);
        payload.append('signature', authResult.data.signature);
        payload.append('expire', String(authResult.data.expire));
        payload.append('token', authResult.data.token);
        payload.append('folder', authResult.data.folder);
        payload.append(
          'tags',
          `products,company-${authResult.data.company_tag},module-products`,
        );
        payload.append('useUniqueFileName', 'false');
        payload.append('overwriteFile', 'false');

        try {
          const uploadResult = await uploadImageKitFileWithProgress(
            payload,
            setImageUploadProgress,
          );

          if (!uploadResult.fileId || !uploadResult.url) {
            throw new Error(uploadResult.message ?? 'Upload foto gagal.');
          }

          return {
            file_id: uploadResult.fileId,
            url: uploadResult.url,
            thumbnail_url: uploadResult.thumbnailUrl,
            width: uploadResult.width,
            height: uploadResult.height,
          };
        } catch (error) {
          if (isImageKitFileNameConflictError(error) && duplicateIndex < 20) {
            continue;
          }
          throw error;
        }
      }

      throw new Error(
        'Nama file foto bentrok terlalu banyak. Coba ganti nama produk.',
      );
    },
    [setImageUploadProgress],
  );

  const rollbackUploadedImage = React.useCallback(async (fileId: string) => {
    try {
      const response = await fetch('/api/imagekit/files/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ file_id: fileId }),
      });

      if (!response.ok) {
        console.error('IMAGEKIT_ROLLBACK_DELETE_FAILED', await response.text());
      }
    } catch (error) {
      console.error('IMAGEKIT_ROLLBACK_DELETE_FAILED', error);
    }
  }, []);

  const handleImageFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.currentTarget.files?.[0];
    if (!file) return;

    try {
      clearPendingImage();
      validateImageFile(file);
      const sourceDimensions = await readImageDimensions(file);
      validateImageFile(file, sourceDimensions);

      const optimizedFile = await optimizeImageBeforeUpload(file);
      const optimizedDimensions = await readImageDimensions(optimizedFile);
      validateImageFile(optimizedFile, optimizedDimensions);

      const nextPreviewUrl = URL.createObjectURL(optimizedFile);

      setPendingImagePreviewUrl((current) => {
        if (current) URL.revokeObjectURL(current);
        return nextPreviewUrl;
      });
      setPendingImageFile(optimizedFile);
      // toast.success(
      //   `Foto siap diupload (${optimizedDimensions.width}x${optimizedDimensions.height}). Upload dilakukan saat simpan produk.`,
      // );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'File foto tidak valid.',
      );
    } finally {
      event.currentTarget.value = '';
    }
  };

  const onSubmit = (values: ProductFormValuesType) => {
    startTransition(async () => {
      let normalizedValues = {
        ...normalizeProductFormPayload(values),
        category: PRODUCT_LOCKED_CATEGORY,
      };
      let uploadedImageFileId: string | null = null;

      try {
        if (pendingImageFile) {
          setIsImageUploading(true);
          setImageUploadProgress(0);
          const uploadedImage = await uploadProductImage(
            pendingImageFile,
            normalizedValues.name,
          );
          uploadedImageFileId = uploadedImage.file_id;
          normalizedValues = {
            ...normalizedValues,
            image: uploadedImage,
          };
        }
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : 'Upload foto gagal.',
        );
        return;
      } finally {
        setIsImageUploading(false);
        setImageUploadProgress(0);
      }

      let result: Awaited<ReturnType<typeof createProductAction>>;
      try {
        result = isEditMode
          ? await updateProductAction({
              product_id,
              ...normalizedValues,
            })
          : await createProductAction(normalizedValues);
      } catch {
        if (uploadedImageFileId) {
          await rollbackUploadedImage(uploadedImageFileId);
        }
        toast.error('Sedang ada gangguan sistem. Coba lagi beberapa saat.');
        return;
      }

      if (!result.ok) {
        if (uploadedImageFileId) {
          await rollbackUploadedImage(uploadedImageFileId);
        }

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
      clearPendingImage();
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
        append(createEmptyProductVariant({ is_default: true }));
        return;
      }

      if (
        removedVariant?.is_default ||
        !nextVariants.some((v) => v.is_default)
      ) {
        markVariantAsDefault(0);
      }
    },
    [append, form, markVariantAsDefault, remove],
  );

  const variantsError = form.formState.errors.variants;
  const rawImagePreviewSrc =
    pendingImagePreviewUrl ?? watchedImage?.thumbnail_url ?? watchedImage?.url;
  const imagePreviewSrc = rawImagePreviewSrc
    ? rawImagePreviewSrc.startsWith('blob:')
      ? rawImagePreviewSrc
      : buildImageKitTransformUrl(rawImagePreviewSrc, [
          'w-96',
          'h-96',
          'c-at_max',
          'q-75',
          'f-webp',
        ])
    : null;
  const rawImageDialogSrc = pendingImagePreviewUrl ?? watchedImage?.url;
  const imageDialogSrc = rawImageDialogSrc
    ? rawImageDialogSrc.startsWith('blob:')
      ? rawImageDialogSrc
      : buildImageKitTransformUrl(rawImageDialogSrc, [
          'w-1600',
          'q-85',
          'f-webp',
        ])
    : null;
  const hasImagePreview = Boolean(imagePreviewSrc && imageDialogSrc);
  const hasSelectedOrExistingImage = Boolean(watchedImage || pendingImageFile);
  const uploadButtonLabel = isImageUploading
    ? 'Mengunggah foto...'
    : pendingImageFile
      ? 'Ganti foto terpilih'
      : watchedImage
        ? 'Ganti foto'
        : 'Upload foto';

  return (
    <Card>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nama produk</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Contoh: Kaos Basic Premium"
                        autoComplete="off"
                        {...field}
                      />
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
                    <FormLabel className="flex items-center gap-1.5">
                      Kategori{' '}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <InfoIcon className="text-muted-foreground size-3.5" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Untuk saat ini kategori dikunci ke Umum.</p>
                        </TooltipContent>
                      </Tooltip>
                    </FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih kategori produk" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {PRODUCT_CATEGORY_OPTIONS.map((value) => (
                          <SelectItem key={value} value={value}>
                            {PRODUCT_CATEGORY_LABELS[value]}
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
                name="unit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Satuan</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih satuan" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {PRODUCT_UNIT_OPTIONS.map((value) => (
                          <SelectItem key={value} value={value}>
                            {PRODUCT_UNIT_LABELS[value]}
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
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status produk</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {PRODUCT_STATUS_OPTIONS.map((value) => (
                          <SelectItem key={value} value={value}>
                            {PRODUCT_STATUS_LABELS[value]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-4 rounded-lg border p-3">
              <div className="flex flex-col gap-4 md:flex-row">
                <div className="">
                  <div className="bg-muted/10 rounded-md border border-dashed p-3">
                    {hasImagePreview ? (
                      <ImagePreviewDialog
                        src={imageDialogSrc!}
                        thumbnail_src={imagePreviewSrc!}
                        external_src={rawImageDialogSrc!}
                        alt={`Foto produk ${watchedName || 'baru'}`}
                        title={
                          watchedName ? `Foto ${watchedName}` : 'Foto produk'
                        }
                        description="Klik foto untuk melihat ukuran lebih besar."
                        trigger_class_name="size-16 rounded-md"
                        trigger_image_class_name="size-16 rounded-md object-cover"
                      />
                    ) : (
                      <div className="bg-background/40 text-muted-foreground flex size-16 items-center justify-center rounded-md border border-dashed">
                        <ImagePlusIcon className="size-10" />
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-3 md:max-w-xl">
                  <div>
                    <p className="flex items-center gap-1.5 text-sm font-medium">
                      Gambar produk{' '}
                      <span className="text-muted-foreground text-xs">
                        (maks 5MB)
                      </span>
                    </p>
                    <p className="text-muted-foreground text-xs">
                      Format: JPG/PNG/WEBP.
                    </p>
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageFileChange}
                    disabled={isPending || isImageUploading}
                    className="hidden"
                  />

                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={isPending || isImageUploading}
                      onClick={() => fileInputRef.current?.click()}
                      className="gap-2"
                    >
                      {isImageUploading ? <Spinner className="size-4" /> : null}
                      {uploadButtonLabel}
                    </Button>

                    {hasSelectedOrExistingImage ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        disabled={isPending || isImageUploading}
                        onClick={() => {
                          clearPendingImage();
                          form.setValue('image', null, {
                            shouldDirty: true,
                            shouldTouch: true,
                          });
                        }}
                      >
                        Hapus foto
                      </Button>
                    ) : null}
                  </div>

                  {isImageUploading ? (
                    <div className="w-full max-w-xs space-y-1">
                      <div className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
                        <div
                          className="bg-primary h-full transition-all"
                          style={{ width: `${imageUploadProgress}%` }}
                        />
                      </div>
                      <p className="text-muted-foreground text-xs">
                        Progress upload: {imageUploadProgress}%
                      </p>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="space-y-3 rounded-lg">
              <div>
                <p className="flex items-center gap-1.5 text-sm font-medium">
                  Varian{' '}
                  <span className="text-muted-foreground text-xs">
                    (Opsional)
                  </span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <InfoIcon className="text-muted-foreground size-3.5" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>
                        {' '}
                        Kami sediakan 1 baris varian. Boleh dibiarkan kosong
                        kalau produk ini tidak punya varian.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </p>
                <p className="text-muted-foreground mt-1 text-xs">
                  {isEditMode
                    ? 'Stok bersifat hanya baca di halaman produk. Gunakan modul Stok untuk mutasi stok.'
                    : 'Isi stok awal saat membuat produk agar tidak perlu input ulang di modul Stok.'}
                </p>
              </div>

              <div className="space-y-4">
                {fields.map((variantField, index) => {
                  return (
                    <div
                      key={variantField.form_key}
                      className="space-y-3 rounded-md border p-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium">
                          Varian {index + 1}
                        </p>
                        <div className="flex flex-wrap items-center gap-2">
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
                                <Input
                                  placeholder="Contoh: Hitam / L"
                                  {...field}
                                />
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
                                <NumberInput
                                  value={field.value}
                                  onBlur={field.onBlur}
                                  onValueChange={field.onChange}
                                  placeholder="0"
                                  decimalScale={2}
                                  leftAttachment="Rp"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name={`variants.${index}.opening_stock`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>
                                {isEditMode
                                  ? 'Stok saat ini (hanya baca)'
                                  : 'Stok awal'}
                              </FormLabel>
                              <FormControl>
                                <NumberInput
                                  value={field.value}
                                  onBlur={field.onBlur}
                                  onValueChange={field.onChange}
                                  placeholder="0"
                                  decimalScale={2}
                                  disabled={isEditMode}
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
                                  placeholder="Contoh: SKU-KAOS-001"
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
                                  placeholder="Contoh: 899XXXXXXXXXX"
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
                  );
                })}

                {typeof variantsError?.message === 'string' ? (
                  <p className="text-destructive text-sm">
                    {variantsError.message}
                  </p>
                ) : null}

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    const hasDefault = form
                      .getValues('variants')
                      .some((variant) => variant.is_default);

                    append(
                      createEmptyProductVariant({ is_default: !hasDefault }),
                    );
                  }}
                >
                  Tambah varian
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Button
                  type="submit"
                  isLoading={isPending || isImageUploading}
                  loadingText="Menyimpan produk..."
                >
                  {isEditMode ? 'Simpan perubahan' : 'Simpan produk'}
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/products">Batal</Link>
                </Button>
              </div>

              {isEditMode && product_id ? (
                <DeleteButton
                  action={() => deleteProductAction({ product_id })}
                  title="Hapus produk ini?"
                  description={
                    <>
                      Produk <strong>{watchedName || 'Produk'}</strong> akan
                      dihapus permanen bersama varian terkait. Aktivitas
                      penghapusan tetap tercatat di log.
                    </>
                  }
                  trigger_label="Hapus"
                  trigger_variant="destructive"
                  trigger_size="sm"
                  success_toast_message="Produk berhasil dihapus."
                  on_success={() => {
                    router.push('/products');
                  }}
                />
              ) : null}
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
