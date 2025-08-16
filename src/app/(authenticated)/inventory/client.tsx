"use client";

import { TypographyH3 } from "@/components/typhography";
import { Button, buttonVariants } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { DownloadIcon, PlusSquareIcon, UploadCloud } from "lucide-react";
import Link from "next/link";

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface InventoryClientProps {}

const InventoryClient = ({}: InventoryClientProps) => {
  return (
    <div>
      <div className="flex w-full items-center justify-between">
        <TypographyH3>Inventory</TypographyH3>

        <div className="flex items-center gap-2">
          {/* Import Button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant={"outline"} className="cursor-pointer">
                <DownloadIcon className="mr-2 h-4 w-4" />
                Import
              </Button>
            </TooltipTrigger>
            <TooltipContent>Import data from Excel</TooltipContent>
          </Tooltip>

          {/* Export Button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant={"outline"} className="cursor-pointer">
                <UploadCloud className="mr-2 h-4 w-4" />
                Export
              </Button>
            </TooltipTrigger>
            <TooltipContent>Export data to Excel</TooltipContent>
          </Tooltip>

          {/* Item Button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                href={"/inventory/create-update-item"}
                className={buttonVariants({ className: "cursor-pointer" })}
              >
                <PlusSquareIcon className="mr-2 h-4 w-4" />
                Item
              </Link>
            </TooltipTrigger>
            <TooltipContent>Add new item</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </div>
  );
};

export default InventoryClient;
