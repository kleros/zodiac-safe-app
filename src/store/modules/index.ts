import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import SafeAppsSDK from "@gnosis.pm/safe-apps-sdk";
import { Module, ModulesState, ModuleType, Operation } from "./models";
import {
  fetchSafeInfo,
  fetchSafeModulesAddress,
  fetchSafeTransactions,
} from "../../services";
import { isMultiSendDataEncoded, sanitizeModule } from "./helpers";
import {
  getFactoryContractAddress,
  getModuleContractAddress,
} from "@gnosis/module-factory";

const initialModulesState: ModulesState = {
  operation: "read",
  reloadCount: 0,
  loadingModules: false,
  list: [],
  current: undefined,
  pendingModules: [],
};

export const fetchModulesList = createAsyncThunk(
  "modules/fetchModulesList",
  async ({
    safeSDK,
    safeAddress,
    chainId,
  }: {
    safeSDK: SafeAppsSDK;
    chainId: number;
    safeAddress: string;
  }): Promise<Module[]> => {
    const moduleAddresses = await fetchSafeModulesAddress(safeAddress);
    const requests = moduleAddresses.map(
      async (m) => await sanitizeModule(m, safeSDK, chainId)
    );
    requests.reverse();
    return await Promise.all(requests);
  }
);

export const fetchPendingModules = createAsyncThunk(
  "modules/fetchPendingModules",
  async ({
    safeAddress,
    chainId,
  }: {
    chainId: number;
    safeAddress: string;
  }) => {
    const safeInfo = await fetchSafeInfo(chainId, safeAddress);
    const transactions = await fetchSafeTransactions(chainId, safeAddress, {
      nonce__gte: safeInfo.nonce.toString(),
    });

    const moduleFactoryContractAddress = getFactoryContractAddress(chainId);
    const daoModuleMasterContractAddress = getModuleContractAddress(
      chainId,
      "dao"
    );

    const isDaoModuleTxPending = transactions.some(
      (safeTransaction) =>
        safeTransaction.dataDecoded &&
        isMultiSendDataEncoded(safeTransaction.dataDecoded) &&
        safeTransaction.dataDecoded.parameters[0].valueDecoded.some(
          (transaction) =>
            transaction.to.toLowerCase() === moduleFactoryContractAddress &&
            transaction.dataDecoded &&
            transaction.dataDecoded.method === "deployModule" &&
            transaction.dataDecoded.parameters.some(
              (param) =>
                param.name === "masterCopy" &&
                param.value.toLowerCase() === daoModuleMasterContractAddress
            )
        )
    );

    if (isDaoModuleTxPending) {
      return [ModuleType.DAO];
    }
    return [];
  }
);

export const modulesSlice = createSlice({
  name: "modules",
  initialState: initialModulesState,
  reducers: {
    increaseReloadCount: (state) => {
      state.reloadCount += 1;
    },
    setModules(state, action: PayloadAction<Module[]>) {
      state.list = action.payload;
    },
    setCurrentModule(state, action: PayloadAction<Module>) {
      state.current = action.payload;
      state.operation = "read";
    },
    unsetCurrentModule(state) {
      state.current = undefined;
    },
    setOperation(state, action: PayloadAction<Operation>) {
      state.operation = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(fetchModulesList.pending, (state) => {
      state.loadingModules = true;
    });
    builder.addCase(fetchModulesList.rejected, (state) => {
      state.loadingModules = false;
    });
    builder.addCase(fetchModulesList.fulfilled, (state, action) => {
      state.loadingModules = false;
      state.list = action.payload;
    });
    builder.addCase(fetchPendingModules.fulfilled, (state, action) => {
      state.pendingModules = action.payload;
    });
  },
});

export const {
  increaseReloadCount,
  setCurrentModule,
  setModules,
  unsetCurrentModule,
  setOperation,
} = modulesSlice.actions;
