import { useReducer } from "react";

const initialState = {
  isLoading: false
};

const loaderReducer = (state, action) => {
  switch (action.type) {
    case 'SHOW': return { isLoading: true };
    case 'HIDE': return { isLoading: false };
    default: throw new Error();
  }
};

export const useLoader = () => {
  const [state, dispatch] = useReducer(loaderReducer, initialState)

  return { ...state, dispatch }
}
