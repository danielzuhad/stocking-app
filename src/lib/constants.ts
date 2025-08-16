import { categoryEnum, unitEnum } from "@/schema";
import { enumToValueLabel } from "./utils";

export const categoryItemList = enumToValueLabel(categoryEnum.enumValues);

export const unitItemList = enumToValueLabel(unitEnum.enumValues);
