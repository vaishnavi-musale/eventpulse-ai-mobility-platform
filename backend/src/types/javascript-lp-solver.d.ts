// Type declarations for javascript-lp-solver
// The package ships no built-in types
declare module "javascript-lp-solver" {
  export interface VariableMap {
    [varName: string]: number;
  }

  export interface Constraint {
    equal?: number;
    max?: number;
    min?: number;
  }

  export interface ConstraintMap {
    [constraintName: string]: Constraint;
  }

  export interface Model {
    optimize: string;
    opType: "max" | "min";
    constraints: ConstraintMap;
    variables: {
      [varName: string]: VariableMap;
    };
    ints?: { [varName: string]: 1 };
  }

  export interface Solution {
    feasible: boolean;
    result: number;
    [varName: string]: number | boolean;
  }

  export class Solver {
    Solve(model: Model): Solution;
    newSolution(
      model: Model,
      dual?: boolean,
      ticks?: number,
    ): Solution;
  }

  export const Solver: Solver;
  export default Solver;
}
