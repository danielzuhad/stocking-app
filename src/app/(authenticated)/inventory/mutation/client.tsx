"use client";

import ImageUpload from "@/components/image-upload";
import InputNumericFormat from "@/components/input-numeric-format";
import { SelectInput } from "@/components/input-select";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiPost } from "@/lib/axios-client";
import { categoryItemList, unitItemList } from "@/lib/constants";
import { handleErrorToast } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeftIcon, PlusIcon, SaveIcon, XIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

const unitValues = unitItemList.map((option) => option.value) as [string, ...string[]];
const fashionOptions = categoryItemList.filter((option) => option.value === "fashion");
const fixedCategoryOption = fashionOptions[0] ?? {
  value: "fashion",
  label: "Fashion",
};

const variantFormSchema = z.object({
  color: z.string({ error: "Variant is required." }).min(1, { message: "Variant is required." }),
  size: z.string().optional().nullable(),
  sku: z.string().optional().nullable(),
  price: z.number({ error: "Price is required." }).min(0, { message: "Price is required." }),
  quantity: z
    .number({ error: "Quantity is required." })
    .int()
    .min(0, { message: "Quantity is required." }),
});

const formSchema = z.object({
  name: z
    .string({ error: "Product name is required." })
    .min(1, { message: "Product name is required." }),
  category: z.literal("fashion"),
  unit: z.enum(unitValues),
  sku: z.string().optional().nullable(),
  brand: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  image: z
    .object({
      url: z.string().url("Invalid image URL."),
      fileId: z.string().optional().nullable(),
    })
    .optional()
    .nullable(),
  variants: z
    .array(variantFormSchema)
    .min(1, { message: "At least one product variant is required." }),
});

// contoh: validasi
type FormType = z.infer<typeof formSchema>;

export default function CreateUpdateItemClient() {
  const router = useRouter();

  const form = useForm<FormType>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      sku: "",
      brand: "",
      category: "fashion",
      description: "",
      image: null,
      unit: "pcs",
      variants: [
        {
          color: "",
          size: "",
          sku: "",
          quantity: 0,
          price: 0,
        },
      ],
    },
  });

  const isSubmitting = form.formState.isSubmitting;

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "variants",
  });

  const onSubmit = async (data: FormType) => {
    try {
      const payload = {
        name: data.name,
        category: data.category,
        unit: data.unit,
        sku: data.sku?.trim() ? data.sku : null,
        brand: data.brand?.trim() ? data.brand : null,
        description: data.description?.trim() ? data.description : null,
        image: data.image ?? null,
        variants: data.variants.map((variant) => ({
          color: variant.color,
          size: variant.size?.trim() ? variant.size : null,
          sku: variant.sku?.trim() ? variant.sku : null,
          price: variant.price,
          quantity: variant.quantity,
        })),
      };

      await apiPost("/items", payload);

      toast.success("Item created successfully.", {
        description: "Your product has been added to the inventory.",
      });

      router.push("/inventory");
    } catch (error) {
      handleErrorToast(error);
    }
  };

  return (
    <div className="w-full">
      <h1 className="mb-4 text-xl font-semibold md:text-2xl">Create Item</h1>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
          {/* Left Column */}
          <div className="space-y-6 lg:col-span-2">
            {/* General Info */}
            <div className="rounded-xl bg-white p-4 shadow">
              <h2 className="text-muted-foreground mb-4 text-lg font-semibold">
                General Information
              </h2>
              <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2 lg:grid-cols-3">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel aria-required>Product Name</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          value={field?.value || ""}
                          placeholder="e.g. Wireless Mouse, Moisturizing Cream"
                          disabled={isSubmitting}
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
                      <FormLabel aria-required>Category</FormLabel>
                      <SelectInput
                        name={field.name}
                        isDisabled
                        isSearchable={false}
                        options={[fixedCategoryOption]}
                        onChange={(option) =>
                          field.onChange((option as { value: string } | null)?.value ?? "fashion")
                        }
                        value={
                          fashionOptions.find((option) => option.value === field.value) ??
                          fixedCategoryOption
                        }
                        placeholder="Category"
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="sku"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel isOptional={true}>SKU</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="e.g. PROD-001"
                          value={field.value ?? ""}
                          disabled={isSubmitting}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="brand"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel isOptional={true}>Brand / Series</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="e.g. Samsung, Nivea, IKEA"
                          value={field.value ?? ""}
                          disabled={isSubmitting}
                        />
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
                      <FormLabel aria-required>Unit of Measure</FormLabel>
                      <FormControl>
                        <SelectInput
                          name={field.name}
                          options={unitItemList}
                          onChange={(option) =>
                            field.onChange((option as { value: string } | null)?.value ?? "")
                          }
                          value={unitItemList.find((opt) => opt.value === field.value) ?? null}
                          placeholder="Select unit (e.g. pcs, box, ml)"
                          isDisabled={isSubmitting}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="mt-4 flex w-full flex-col items-start gap-4 lg:flex-row">
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem className="w-full">
                      <FormLabel isOptional={true}>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="e.g. Lightweight cotton shirt designed for everyday comfort and versatility."
                          value={field.value ?? ""}
                          disabled={isSubmitting}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="image"
                  render={({ field }) => (
                    <FormItem className="w-full">
                      <ImageUpload
                        initialUrl={field?.value?.url ?? null}
                        maxSizeMB={1}
                        onChange={field.onChange}
                        className="h-full"
                      />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Variants */}
            <div className="rounded-xl bg-white p-4 shadow">
              <h2 className="text-muted-foreground mb-4 text-lg font-semibold">Variants</h2>

              {/* Header desktop */}
              <div className="mb-1 hidden grid-cols-[repeat(6,minmax(0,1fr))] gap-3 text-sm font-medium lg:grid">
                <Label aria-required isOptional={false}>
                  Colour / Variant
                </Label>
                <Label isOptional={true}>Size / Volume</Label>
                <Label isOptional={true}>Variant SKU</Label>
                <Label aria-required isOptional={false}>
                  Base Price
                </Label>
                <Label aria-required isOptional={false}>
                  Stock Quantity
                </Label>
                <Label /> {/* kosong untuk tombol delete */}
              </div>

              {/* Items */}
              <div className="flex flex-col items-center gap-3">
                {fields.map((item, index) => (
                  <div
                    key={item.id}
                    className="border-border/50 grid grid-cols-1 gap-3 rounded-lg border p-3 lg:grid-cols-[repeat(6,minmax(0,1fr))] lg:items-center lg:gap-4 lg:border-0 lg:p-0"
                  >
                    {/* Color */}
                    <FormField
                      control={form.control}
                      name={`variants.${index}.color`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel aria-required className="lg:hidden">
                            Colour / Variant
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="e.g. Black, Mint, Matte Finish"
                              value={field.value ?? ""}
                              disabled={isSubmitting}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Size */}
                    <FormField
                      control={form.control}
                      name={`variants.${index}.size`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel isOptional={false} className="lg:hidden">
                            Size
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="e.g. M, 250ml, 1kg"
                              value={field.value ?? ""}
                              disabled={isSubmitting}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    {/* SKU */}
                    <FormField
                      control={form.control}
                      name={`variants.${index}.sku`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel isOptional={false} className="lg:hidden">
                            Variant SKU
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="e.g. PROD-BLK-M"
                              value={field.value ?? ""}
                              disabled={isSubmitting}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    {/* Base Price */}
                    <FormField
                      control={form.control}
                      name={`variants.${index}.price`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel aria-required className="lg:hidden">
                            Base Price
                          </FormLabel>
                          <FormControl>
                            <InputNumericFormat
                              leftAttachment="Rp."
                              thousandSeparator
                              customInput={Input}
                              allowNegative={false}
                              onValueChange={(values) =>
                                field.onChange(values.floatValue ?? undefined)
                              }
                              value={field.value ?? ""}
                              placeholder="e.g. 349,000"
                              disabled={isSubmitting}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Quantity */}
                    <FormField
                      control={form.control}
                      name={`variants.${index}.quantity`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="lg:hidden">Quantity</FormLabel>
                          <FormControl>
                            <InputNumericFormat
                              placeholder="e.g. 25"
                              thousandSeparator
                              customInput={Input}
                              allowNegative={false}
                              disabled={isSubmitting}
                              onValueChange={(values) =>
                                field.onChange(values.floatValue ?? undefined)
                              }
                              value={field.value ?? ""}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Delete button */}
                    <div className="flex justify-end lg:justify-center">
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        onClick={() => {
                          if (fields.length === 1) {
                            form.setValue("variants", [
                              { color: "", size: "", sku: "", quantity: 0, price: 0 },
                            ]);
                          } else {
                            remove(index);
                          }
                        }}
                        disabled={isSubmitting}
                      >
                        <XIcon />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex w-full justify-end pt-3">
                <Button
                  type="button"
                  variant="primary_outline"
                  onClick={() => append({ color: "", size: "", sku: "", quantity: 0, price: 0 })}
                  disabled={isSubmitting}
                >
                  <PlusIcon className="mr-1" /> Add Variant
                </Button>
              </div>
            </div>
          </div>

          <div className="flex flex-col-reverse gap-2 pt-5 md:flex-row md:justify-end">
            <Button
              type="button"
              className="w-full md:w-fit"
              variant={"outline"}
              onClick={() => router.back()}
              disabled={isSubmitting}
            >
              <ArrowLeftIcon />
              Back
            </Button>

            <Button
              type="submit"
              className="flex w-full items-center md:w-fit"
              isLoading={isSubmitting}
              disabled={isSubmitting}
            >
              <SaveIcon />
              Save
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
