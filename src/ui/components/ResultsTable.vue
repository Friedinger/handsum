<script setup lang="ts">
import { strings } from "../../data/strings";
import type { PlayerResult, StartedGame } from "../../engine";
import { playerName } from "../describe";

defineProps<{ state: StartedGame; results: readonly PlayerResult[] }>();
</script>

<template>
  <section>
    <h3>{{ strings.table.results }}</h3>
    <table class="results">
      <thead>
        <tr>
          <th></th>
          <th>{{ strings.table.cardSum }}</th>
          <th>{{ strings.table.score }}</th>
          <th>{{ strings.table.winner }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="result in results" :key="result.playerId">
          <td>{{ playerName(state, result.playerId) }}</td>
          <td>{{ result.cardSum }}</td>
          <td>{{ result.score }}</td>
          <td>{{ result.isWinner ? "✓" : "" }}</td>
        </tr>
      </tbody>
    </table>
  </section>
</template>
