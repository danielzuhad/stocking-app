"use client";

import { InputSelect } from "@/components/input-select";
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
import { Textarea } from "@/components/ui/textarea";
import { handleErrorToast } from "@/lib/utils";
import { itemsTable } from "@/schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { createInsertSchema } from "drizzle-zod";
import { useFieldArray, useForm } from "react-hook-form";
import { NumericFormat } from "react-number-format";
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
      category: undefined,
      description: "",
      price: "0.00",
      unit: "pcs",
      variants: [{ color: "", size: "", sku: "", quantity: 0 }],
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
    <div className="mx-auto max-w-7xl p-4 md:p-6">
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
                      <FormLabel>Product Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Product Name" {...field} />
                      </FormControl>
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
                        <Input placeholder="SKU" {...field} />
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
                        <Input placeholder="Brand" {...field} />
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
                      <FormLabel>Category</FormLabel>
                      <InputSelect
                        {...field}
                        options={[]}
                        onChange={(val) => field.onChange(val?.value)}
                        placeholder="Select Unit"
                      />
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
                      <Textarea rows={4} placeholder="Description" {...field} />
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
                        <NumericFormat
                          thousandSeparator
                          prefix="Rp "
                          customInput={Input}
                          allowNegative={false}
                          onValueChange={(values) => field.onChange(values.floatValue || 0)}
                          value={field.value}
                          placeholder="Price"
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
                        <Input placeholder="pcs" {...field} />
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
              {fields.map((item, index) => (
                <div
                  key={item.id}
                  className="mb-2 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-5"
                >
                  <FormField
                    control={form.control}
                    name={`variants.${index}.color`}
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input placeholder="Color" {...field} />
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
                          <Input placeholder="Size" {...field} />
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
                          <Input placeholder="Variant SKU" {...field} />
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
                          <Input type="number" placeholder="Quantity" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <Button type="button" variant="destructive" onClick={() => remove(index)}>
                    Remove
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="secondary"
                onClick={() => append({ color: "", size: "", sku: "", quantity: 0 })}
              >
                + Add Variant
              </Button>
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
            <Button type="submit" className="w-full">
              Save Item
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
