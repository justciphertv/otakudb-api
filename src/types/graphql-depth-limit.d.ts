declare module "graphql-depth-limit" {
  import { ValidationRule } from "graphql";
  export default function depthLimit(maxDepth: number): ValidationRule;
}
