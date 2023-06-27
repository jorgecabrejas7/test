import Link from "next/link";
import Image from 'next/image';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import { signIn, useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { toast } from 'react-toastify';
import { loader } from "@/components/loader/loader";
import { unprotectedFetch, protectedFetch } from "@/lib/apifetch";
import Router from "next/router";
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { useRouter } from 'next/router';

export default () => {
  const { t } = useTranslation('common');

  const session = useSession();
  const router = useRouter();

  useEffect(() => {
    loader(true);
  }, []);

  useEffect(() => {
    if(session.status === "authenticated") {
      (async () => {
        const user = session.data.user;
        await protectedFetch(session, process.env.BACK_API_URL + "session/update?" + new URLSearchParams({ session: user.session }), "get", null, t);
        Router.replace(router.query.redirect || "/home");
      })();
    }
    else if(session.status === "unauthenticated") loader(false);
  }, [session.status]);

  const [registerDetails, setRegisterDetails] = useState({ email: "", password: "" });
  const [registrationStep, setRegistrationStep] = useState(0);

  const handleSubmit = async e => {
    e.preventDefault();

    if(registrationStep === 1) {
      loader(true);

      let res = await unprotectedFetch(process.env.BACK_API_URL + "user", "post", JSON.stringify(registerDetails), t);  
      if(res.status === 200) {
        res = await signIn("credentials", {
          email: registerDetails.email,
          password: registerDetails.password,
          redirect: false
        });
        
        if(!res.ok) {
          loader(false);
          toast.error(t(res.error));
        }
      }
      else {
        loader(false);
      }
    }
    else {
      setRegistrationStep(registrationStep + 1);

    }
  };

  if(session.status !== "unauthenticated")
  return <div className="auth-page"></div>;
  
  const renderTextFields = () => {
    switch(registrationStep) {
      case 0: {
        return (
          <>
            <TextField required id="email" type={ "email" } label={ t("COMMON.EMAIL") } variant="outlined" className="mb-10" value={ registerDetails.email } onChange={({ target }) => setRegisterDetails({ ...registerDetails, email: target.value })}/>
            <TextField required id="password" type={"password"} label={ t("COMMON.PASSWORD") } variant="outlined" className="mb-10" inputProps={{ minLength: 6 }} value={ registerDetails.password } onChange={({ target }) => setRegisterDetails({ ...registerDetails, password: target.value })}/>
          </>
        );
      }
      case 1: {
        return (
          <>
            <span className="text-small mb-10 text-center cursor-pointer" onClick={ () => setRegistrationStep(registrationStep - 1) }>{ t("PAGES.REGISTER.GO_BACK") }</span>
            <TextField required id="firstname" label={ t("PAGES.PROFILE.SETTINGS.FIRST_NAME") } variant="outlined" className="mb-10"
                value={ registerDetails?.firstname || "" } onChange={({ target }) => setRegisterDetails({ ...registerDetails, firstname: target.value })}/>
            <TextField required id="lastname" label={ t("PAGES.PROFILE.SETTINGS.LAST_NAME") } variant="outlined" className="mb-10"
                value={ registerDetails?.lastname || "" } onChange={({ target }) => setRegisterDetails({ ...registerDetails, lastname: target.value })}/>
          </>
        );
      }
    }  
  };

  return (
    <div className="auth-page">
      <div className="logo">
        <Image src="/img/logo.png" alt="logo" fill/>
      </div>
      <div className="d-flex flex-column align-items-center">
        <div className="d-flex flex-column m-30">
          <span className="title-medium text-center fw-bold">{ t("PAGES.REGISTER.TITLE_STEP_" + registrationStep) }</span>
        </div>
        <Box
          component="form"
          sx={{
            '& > :not(style)': { m: 1, width: '40ch' },
          }}
          autoComplete="off"
          onSubmit={ handleSubmit }
        >
          <div className="d-flex flex-column">
            { renderTextFields() }
            <Button variant="contained" size="large" type="submit">{ t("COMMON.CONTINUE") }</Button>
            <label style={{ textAlign: "center" }} className="text-medium">{ t('PAGES.REGISTER.HAVE_ACCOUNT') } <Link href={"/auth/login"} className="primary-color cursor-pointer">{ t('COMMON.LOGIN') }</Link></label>
          </div>
        </Box>
      </div> 
    </div>
  );
};

export async function getStaticProps({ locale }) {
  return {
      props: {
          ...(await serverSideTranslations(locale, ['common']))
      }
  };
}