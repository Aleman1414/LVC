import { useSupabase } from './useSupabase';

export function useFirestore(tableName, options) {
    return useSupabase(tableName, options);
}

export { useSupabase };
