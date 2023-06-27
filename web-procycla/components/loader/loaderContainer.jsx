import { Oval } from "react-loader-spinner";
import styles from "@/styles/loader.module.css";
import { useEffect } from 'react';
import { useLoader } from "./hooks/useLoader";
import { emitter } from './utils/emitter';
import { loaderDispatcher } from './utils/loaderDispatcher';

const Loader = () => {
  const { isLoading, dispatch } = useLoader();

  useEffect(() => {
    loaderDispatcher({ dispatch });

    return () => {
      emitter.off()
    }
  }, [dispatch]);
  
  if(!isLoading)
  return <></>;
  else document.activeElement.blur();

  return (
      <div className={ styles.loaderContainer }>
        <div className={ styles.loader }>
          <Oval width={ 80 } height={ 80 }/>
        </div>
      </div>
  );
};

export default Loader;