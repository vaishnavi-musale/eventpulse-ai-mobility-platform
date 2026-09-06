// §17 — L5 Simulation REST API.
import { Body, Controller, Post } from "@nestjs/common";
import { SimulationService } from "./simulation.service";
import {
  SimulationInput,
  SimulationPlan,
  SimulationZone,
  ScenarioSeed,
  RedTeamConfig,
} from "./types/scenario.types";
import { SurrogateModel } from "./engine/surrogate-loop.engine";
import {
  MonteCarloConfig,
  SurrogateConfig,
} from "./types/simulation-config.types";

@Controller("simulation")
export class SimulationController {
  constructor(private readonly simulation: SimulationService) {}

  @Post("run")
  async run(@Body() input: SimulationInput) {
    return this.simulation.runSimulation(input);
  }

  @Post("montecarlo")
  monteCarlo(
    @Body()
    body: {
      plan: SimulationPlan;
      zones: SimulationZone[];
      scenario: ScenarioSeed;
      config?: Partial<MonteCarloConfig>;
      redTeam?: RedTeamConfig;
    },
  ) {
    return this.simulation.runMonteCarloOnly(
      body.plan,
      body.zones,
      body.scenario,
      body.config,
    );
  }

  @Post("shadow-city")
  shadowCity(
    @Body()
    body: {
      plan: SimulationPlan;
      zones: SimulationZone[];
      scenario: ScenarioSeed;
      config?: Partial<MonteCarloConfig>;
    },
  ) {
    return this.simulation.runShadowCityOnly(
      body.plan,
      body.zones,
      body.scenario,
      body.config,
    );
  }

  @Post("red-team")
  redTeam(
    @Body()
    body: {
      plan: SimulationPlan;
      zones: SimulationZone[];
      scenario: ScenarioSeed;
      redTeam?: RedTeamConfig;
      config?: Partial<MonteCarloConfig>;
    },
  ) {
    return this.simulation.runRedTeamOnly(
      body.plan,
      body.zones,
      body.scenario,
      body.redTeam,
      body.config,
    );
  }

  @Post("surrogate-loop")
  surrogateLoop(
    @Body()
    body: {
      plan: SimulationPlan;
      zones: SimulationZone[];
      scenario: ScenarioSeed;
      surrogate?: SurrogateModel;
      config?: SurrogateConfig;
    },
  ) {
    return this.simulation.runSurrogateLoopOnly(
      body.plan,
      body.zones,
      body.scenario,
      body.surrogate,
      {},
      body.config,
    );
  }
}
