/**
 * AI 配置状态管理
 *
 * 统一管理 Provider 和模型配置状态
 */

import { create } from "zustand";
import {
  type Provider,
  type ModelParameters,
  getConfig,
  addProvider as apiAddProvider,
  updateProvider as apiUpdateProvider,
  deleteProvider as apiDeleteProvider,
  setActiveProvider as apiSetActiveProvider,
  refreshProviderModels as apiRefreshProviderModels,
  setDefaultParameters as apiSetDefaultParameters,
} from "../../../platform/tauri/client";

export interface AIConfigState {
  // 状态
  providers: Provider[];
  activeProviderId: string | null;
  defaultParameters: ModelParameters;
  loading: boolean;
  refreshingModels: Record<string, boolean>;
  error: string | null;

  // 计算属性
  activeProvider: Provider | null;
  hasValidConfig: boolean;

  // Actions
  loadConfig: () => Promise<void>;
  addProvider: (provider: Provider, apiKey: string) => Promise<void>;
  updateProvider: (provider: Provider, apiKey: string | null) => Promise<void>;
  deleteProvider: (providerId: string) => Promise<void>;
  setActiveProvider: (providerId: string) => Promise<void>;
  refreshModels: (providerId: string) => Promise<void>;
  setDefaultParameters: (params: ModelParameters) => Promise<void>;
  clearError: () => void;
}

export const useAIConfigStore = create<AIConfigState>((set, get) => ({
  // 初始状态
  providers: [],
  activeProviderId: null,
  defaultParameters: {
    model: "",
    temperature: 0.7,
    top_p: 0.9,
    top_k: null,
    max_tokens: 2000,
  },
  loading: false,
  refreshingModels: {},
  error: null,

  // 计算属性
  get activeProvider() {
    const { providers, activeProviderId } = get();
    return providers.find((p: Provider) => p.id === activeProviderId) ?? null;
  },

  get hasValidConfig() {
    const { activeProviderId, defaultParameters } = get();
    return !!activeProviderId && !!defaultParameters.model;
  },

  // Actions
  loadConfig: async () => {
    set({ loading: true, error: null });
    try {
      const config = await getConfig();
      set({
        providers: config.providers || [],
        activeProviderId: config.active_provider_id ?? null,
        defaultParameters: config.default_parameters,
        loading: false,
      });
    } catch (error) {
      set({ loading: false, error: String(error) });
    }
  },

  addProvider: async (provider, apiKey) => {
    try {
      await apiAddProvider(provider, apiKey);
      await apiSetActiveProvider(provider.id);
      await get().loadConfig();
    } catch (error) {
      set({ error: String(error) });
      throw error;
    }
  },

  updateProvider: async (provider, apiKey) => {
    try {
      await apiUpdateProvider(provider, apiKey);
      await get().loadConfig();
    } catch (error) {
      set({ error: String(error) });
      throw error;
    }
  },

  deleteProvider: async (providerId) => {
    try {
      await apiDeleteProvider(providerId);
      await get().loadConfig();
    } catch (error) {
      set({ error: String(error) });
      throw error;
    }
  },

  setActiveProvider: async (providerId) => {
    try {
      await apiSetActiveProvider(providerId);
      await get().loadConfig();
    } catch (error) {
      set({ error: String(error) });
      throw error;
    }
  },

  refreshModels: async (providerId) => {
    set((state) => ({
      refreshingModels: { ...state.refreshingModels, [providerId]: true },
    }));
    try {
      await apiRefreshProviderModels(providerId);
      await get().loadConfig();
    } catch (error) {
      set({ error: String(error) });
    } finally {
      set((state) => ({
        refreshingModels: { ...state.refreshingModels, [providerId]: false },
      }));
    }
  },

  setDefaultParameters: async (params) => {
    try {
      await apiSetDefaultParameters(params);
      await get().loadConfig();
    } catch (error) {
      set({ error: String(error) });
      throw error;
    }
  },

  clearError: () => set({ error: null }),
}));
