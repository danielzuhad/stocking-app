"use client";

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
import { PlusIcon, SaveIcon, XIcon } from "lucide-react";
import { useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";
import z from "zod";

const variantSchema = z.object({
  color: z.string().optional(),
  size: z.string().optional(),
  sku: z.string().optional(),
  quantity: z.number().min(0),
});

// bikin schema insert dari table
const formSchema = createInsertSchema(itemsTable).extend({
  variants: z.array(variantSchema).optional(),
});

// contoh: validasi
type FormType = z.infer<typeof formSchema>;

export default function CreateUpdateItemClient() {
  const form = useForm<FormType>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      sku: "",
      brand: "",
      category: "fashion",
      description: "",
      price: undefined,
      unit: "pcs",
      variants: [{ color: "", size: "", sku: "", quantity: undefined }],
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
      <h1 className="mb-6 text-xl font-semibold md:text-2xl">Create Item</h1>

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="grid grid-cols-1 gap-6 pb-24 lg:grid-cols-3"
        >
          {/* Left Column */}
          <div className="space-y-6 lg:col-span-2">
            {/* General Info */}
            <div className="rounded-xl bg-white p-4 shadow">
              <h2 className="mb-4 text-lg font-semibold">General Information</h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel aria-required>Product Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Product Name" {...field} disabled={isSubmitting} />
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
                        placeholder="Select Unit"
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
                      <FormLabel>SKU</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="SKU"
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
                      <FormLabel>Brand</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Brand"
                          {...field}
                          value={field.value || ""}
                          disabled={isSubmitting}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem className="mt-4">
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        rows={4}
                        placeholder="Description"
                        value={field.value || ""}
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Pricing & Stock */}
            <div className="rounded-xl bg-white p-4 shadow">
              <h2 className="mb-4 text-lg font-semibold">Pricing & Stock</h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Base Price</FormLabel>
                      <FormControl>
                        <InputNumericFormat
                          leftAttachment="Rp."
                          thousandSeparator
                          customInput={Input}
                          allowNegative={false}
                          onValueChange={(values) => field.onChange(values.floatValue || 0)}
                          value={field.value}
                          placeholder="Price"
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
                      <FormLabel>Unit</FormLabel>
                      <FormControl>
                        <SelectInput
                          {...field}
                          options={unitItemList}
                          onChange={(val) => field.onChange(val)}
                          value={unitItemList?.find((opt) => opt.value === field.value)}
                          placeholder="Select Unit"
                          isDisabled={isSubmitting}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Variants */}
            <div className="rounded-xl bg-white p-4 shadow">
              <h2 className="mb-4 text-lg font-semibold">Product Variants</h2>
              <div className="mb-2 grid grid-cols-[repeat(4,minmax(0,1fr))_auto] gap-2 max-md:hidden">
                <Label className="pl-2">Colour</Label>
                <Label className="-ml-1.5">Size</Label>
                <Label className="-ml-5">Variant SKU</Label>
                <Label className="-ml-8">Quantity</Label>
                <span /> {/* kosong untuk tombol delete */}
              </div>

              {fields.map((item, index) => (
                <div key={item.id} className="flex items-center gap-5">
                  <div className="mb-2 grid grid-cols-1 items-center gap-2 sm:grid-cols-2 md:grid-cols-4">
                    <FormField
                      control={form.control}
                      name={`variants.${index}.color`}
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input placeholder="Color" {...field} disabled={isSubmitting} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`variants.${index}.size`}
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input placeholder="Size" {...field} disabled={isSubmitting} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`variants.${index}.sku`}
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input placeholder="Variant SKU" {...field} disabled={isSubmitting} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`variants.${index}.quantity`}
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <InputNumericFormat
                              {...field}
                              placeholder="Quantity"
                              thousandSeparator
                              customInput={Input}
                              allowNegative={false}
                              disabled={isSubmitting}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>

                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => {
                      if (fields.length === 1) {
                        form.setValue("variants", [{ color: "", size: "", sku: "", quantity: 0 }]);
                      } else {
                        remove(index);
                      }
                    }}
                    className="mb-1.5"
                    disabled={isSubmitting}
                  >
                    <XIcon />
                  </Button>
                </div>
              ))}

              <div className="flex w-full justify-end pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={isSubmitting}
                  onClick={() => append({ color: "", size: "", sku: "", quantity: 0 })}
                >
                  <PlusIcon /> Variant
                </Button>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Upload Image */}
            <div className="rounded-xl bg-white p-4 shadow">
              <h2 className="mb-4 text-lg font-semibold">Upload Image</h2>
              <div className="cursor-pointer rounded border-2 border-dashed border-gray-300 p-4 text-center">
                <p className="text-sm text-gray-500">Drag & Drop or Click to Upload</p>
                <input type="file" className="hidden" />
              </div>
            </div>

            {/* Submit */}
            <div className="flex items-center gap-2">
              <Button type="button" className="w-1/2" variant={"outline"}>
                Back
              </Button>

              <Button type="submit" className="flex w-1/2 items-center">
                <SaveIcon />
                Save
              </Button>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}
