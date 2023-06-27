import '@/styles/globals.css'
import { SessionProvider } from 'next-auth/react';
import type { AppProps } from 'next/app'
import { ThemeProvider, createTheme } from '@mui/material/styles';
import Layout from "@/components/layout/layout";
import { appWithTranslation } from 'next-i18next';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Loader from "@/components/loader/loaderContainer";
import Head from 'next/head';


const theme = createTheme({
  palette: {
    primary: {
      main: "#565a5c",
    },
    secondary: {
      main: "#61c250"
    },
    success: {
      main: "#61C250",
      contrastText: "#fff"
    }
  },
});

const App = ({ Component, pageProps, ...appProps }: AppProps) => {
  let layout = true;

  if(appProps.router.pathname === "/" || appProps.router.pathname.includes("auth"))
  layout = false;
  
  if(layout) {
    return (
      <SessionProvider session={ pageProps.session }>
        <ThemeProvider theme={theme}>
          <Head>
              <title>Procycla</title>
              <link rel="shortcut icon" href="/favicon.ico" />
          </Head>
          <Loader/>
          <Layout>
            <Component {...pageProps} />
          </Layout>
          <ToastContainer/>
        </ThemeProvider>
      </SessionProvider>
    );
  }
  else {
    return (
      <SessionProvider session={ pageProps.session }>
        <ThemeProvider theme={theme}>
          <Head>
              <title>Procycla</title>
              <link rel="shortcut icon" href="/favicon.ico" />
          </Head>
          <Loader/>
          <Component {...pageProps} />
          <ToastContainer/>
        </ThemeProvider>
      </SessionProvider>
    );
  }
}

export default appWithTranslation(App)