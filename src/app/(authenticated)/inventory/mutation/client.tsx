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
import { categoryItemList, unitItemList } from "@/lib/constants";
import { handleErrorToast } from "@/lib/utils";
import { itemsTable } from "@/schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { createInsertSchema } from "drizzle-zod";
import { ArrowLeftIcon, PlusIcon, SaveIcon, XIcon } from "lucide-react";
import { useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";
import z from "zod";

// bikin schema insert dari table
const formSchema = createInsertSchema(itemsTable).extend({
  name: z
    .string({ error: "Product name is required." })
    .min(1, { error: "Product name is required." }),
  category: z
    .string({ error: "Please select a product category." })
    .min(1, { error: "Please select a product category." }),
  unit: z.string({ error: "Unit is required." }).min(1, { error: "Unit is required." }),

  variants: z
    .array(
      z.object({
        color: z
          .string({ error: "Variant is required." })
          .min(1, { error: "Variant is required." }),
        size: z.string().optional(),
        sku: z.string().optional(),
        price: z.string({ error: "Price is required." }).min(0, { error: "Price is required." }),
        quantity: z
          .string({ error: "Quantity is required" })
          .min(0, { error: "Quantity is required" }),
      })
    )
    .nonempty({ error: "At least one product variant is required." }),
});

// contoh: validasi
type FormType = z.infer<typeof formSchema>;

export default function CreateUpdateItemClient() {
  const form = useForm<FormType>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: undefined,
      sku: undefined,
      brand: undefined,
      category: "fashion",
      description: undefined,

      unit: "pcs",
      variants: [
        {
          color: undefined,
          size: undefined,
          sku: undefined,
          quantity: undefined,
          price: undefined,
        },
      ],
    },
  });

  const isSubmitting = form.formState.isSubmitting;

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "variants",
  });

  const onSubmit = (data: FormType) => {
    try {
      const payload = {
        ...data,
      };

      console.log({ payload });

      toast.success("Success", {
        description: "You have added an item.",
      });
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
                        {...field}
                        isDisabled={true}
                        options={categoryItemList}
                        onChange={(val) => field.onChange(val)}
                        value={categoryItemList?.find((opt) => opt.value === field.value)}
                        placeholder="Select a category"
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
                          value={field.value || ""}
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
                          value={field.value || ""}
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
                          {...field}
                          options={unitItemList}
                          onChange={(val) => field.onChange(val)}
                          value={unitItemList?.find((opt) => opt.value === field.value)}
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
                          value={field.value || ""}
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
                        initialUrl={field?.value?.url}
                        maxSizeMB={1}
                        onChange={field.onChange}
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
                              value={field.value || ""}
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
                              value={field.value || ""}
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
                              value={field.value || ""}
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
                              onValueChange={(values) => field.onChange(values.floatValue || 0)}
                              value={field.value}
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
                              {...field}
                              placeholder="e.g. 25"
                              thousandSeparator
                              customInput={Input}
                              allowNegative={false}
                              disabled={isSubmitting}
                              onValueChange={(values) => field.onChange(values.floatValue || 0)}
                              value={field.value}
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
                              { color: "", size: "", sku: "", quantity: "0", price: "0" },
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
                  onClick={() =>
                    append({ color: "", size: "", sku: "", quantity: "0", price: "0" })
                  }
                  disabled={isSubmitting}
                >
                  <PlusIcon className="mr-1" /> Add Variant
                </Button>
              </div>
            </div>
          </div>

          <div className="flex flex-col-reverse gap-2 pt-5 md:flex-row md:justify-end">
            <Button type="button" className="w-full md:w-fit" variant={"outline"}>
              <ArrowLeftIcon />
              Back
            </Button>

            <Button type="submit" className="flex w-full items-center md:w-fit">
              <SaveIcon />
              Save
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
