import Link from "next/link";
import Image from 'next/image';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import { signIn, useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import Router from "next/router";
import { toast } from 'react-toastify';
import { loader } from "@/components/loader/loader";
import { protectedFetch } from "@/lib/apifetch";
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

  const [loginDetails, setLoginDetails] = useState({ email: "", password: "", code: "" });
  const [twoFa, setTwoFa] = useState(false);

  const handleSubmit = async e => {
    loader(true);
    e.preventDefault();

    const res = await signIn("credentials", {
      email: loginDetails.email,
      password: loginDetails.password,
      code: twoFa ? loginDetails.code : '',
      redirect: false
    });
    
    if(!res.ok) {
      if(res.error === "2FA") {
        setTwoFa(true);
        loader(false);
      }
      else {
        loader(false);
        toast.error(t(res.error));
      }
    }
  };

  if(session.status !== "unauthenticated")
  return <div className="auth-page"></div>;

  return (
    <>
      <div className="auth-page">
        <div className="logo">
          <Image src="/img/logo.png" alt="logo" fill/>
        </div>
        <div className="d-flex flex-column align-items-center">
          <div className="d-flex flex-column m-30">
            <span className="title-medium text-center fw-bold">{ t("PAGES.LOGIN.TITLE") }</span>
          </div>
          {
            !twoFa ?
              <Box
                component="form"
                sx={{
                  '& > :not(style)': { m: 1, width: '40ch' },
                }}
                autoComplete="off"
                onSubmit={ handleSubmit }
              >
                <div className="d-flex flex-column">
                  <TextField required id="email" type={ "email" } label={ t("COMMON.EMAIL") } variant="outlined" className="mb-10" value={ loginDetails.email } onChange={({ target }) => setLoginDetails({ ...loginDetails, email: target.value })}/>
                  <TextField required id="password" type={"password"} label={ t("COMMON.PASSWORD") } variant="outlined" className="mb-10" inputProps={{ minLength: 6 }} value={ loginDetails.password } onChange={({ target }) => setLoginDetails({ ...loginDetails, password: target.value })}/>
                  <Button variant="contained" size="large" type="submit">{ t("COMMON.CONTINUE") }</Button>
                  <label style={{ textAlign: "center" }} className="text-medium">{ t('PAGES.LOGIN.NO_ACCOUNT') } <Link href={"/auth/register"} className="primary-color cursor-pointer">{ t('COMMON.REGISTER') }</Link></label>
                </div>
              </Box>
            :
              <Box
                component="form"
                sx={{
                  '& > :not(style)': { m: 1, width: '40ch' },
                }}
                autoComplete="off"
                onSubmit={ handleSubmit }
              >
                <div className="d-flex flex-column">
                  <span className="text-medium text-center w-100 mb-10">{ t("PAGES.LOGIN.TWO_FA") }</span>
                  <TextField required id="code" type={ "text" } label={ t("COMMON.CODE") } variant="outlined" className="mb-10" value={ loginDetails.code } onChange={({ target }) => setLoginDetails({ ...loginDetails, code: target.value })}/>
                  <Button variant="contained" size="large" type="submit" className="mb-10">{ t("COMMON.CONTINUE") }</Button>
                  <span onClick={ () => { setLoginDetails({ ...loginDetails, code: "" }); setTwoFa(false); } } className="text-small text-center w-100 cursor-pointer">{ t("COMMON.GO_BACK") }</span>
                </div>
              </Box>
          }
        </div>
      </div>
    </>
  );
};

export async function getStaticProps({ locale }) {
  return {
      props: {
          ...(await serverSideTranslations(locale, ['common']))
      }
  };
}