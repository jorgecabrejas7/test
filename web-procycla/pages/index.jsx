import Image from 'next/image';
import Link from "next/link";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { useTranslation } from 'next-i18next';
import { loader } from "@/components/loader/loader";
import { useState, useEffect } from "react";
import { unprotectedFetch } from "@/lib/apifetch";
import styles from "@/styles/account-and-billing.module.css";
import Icon from '@mui/material/Icon';
import Button from '@mui/material/Button';
import { useSession } from "next-auth/react";

export default () => {
    const { t } = useTranslation('common');
    const session = useSession();
    const [plans, setPlans] = useState([]);

    useEffect(() => {
        loader(true);
    }, []);

    useEffect(() => {
        if(session.status != "loading") {
            const loadPlans = async () => {
                const res = await unprotectedFetch(process.env.BACK_API_URL + "plan", "get", null, t);
                if(res.status === 200) {
                    const data = await res.json();
                    setPlans(data);
                }
        
                loader(false);
            };

            loadPlans();
        }
    }, [session.status]);

    if(plans.length <= 0)
    return <></>;

    return (
        <div className="d-flex flex-column justify-content-center" style={{ minHeight: "100vh" }}>
          <div className="d-flex flex-column justify-content-center align-items-center">
            <div className="logo">
              <Image src="/img/logo.png" alt="logo" fill/>
            </div>
            <span className="title-medium fw-bold text-center mb-30">{ t('PAGES.LANDING.TITLE') }</span>
            <div className="d-flex flex-wrap">
            {
                plans.map((plan, planIndex) => 
                    <div key={ plan.id } className={ styles.cardPlan }>
                        <span className={ "title-small fw-bold" }>{ t(plan.name) }</span>
                        <span className={ "text-small" }>{ t(plan.description) }</span>
                        <ul className="mt-10 mb-10 list-unstyled">
                            {
                                (t(plan.benefits, { returnObjects: true })).map((benefit, index) =>
                                    <li key={ index } className="d-flex"><Icon className="primary-color">done</Icon> <span>{ benefit }</span></li>
                                )
                            }
                        </ul>
                        <div className={ "d-flex flex-column align-items-center m-30" }>
                            <span className={ "text-medium fw-bold" }>{ t(plan.price) + ' ' + t(plan.currency) }</span>
                            <span className={ "text-small" }>{ t('PAGES.PROFILE.ACCOUNT_BILLING.DURATION', { days: plan.duration_days }) }</span>
                        </div>
                        <div>
                            {
                                session.status === 'authenticated' ? 
                                    <Link href={ "/profile/account-and-billing" }><Button variant="outlined" type="button">{ t('COMMON.SELECT') }</Button></Link> :
                                    <Link href={ "/auth/register?redirect=/profile/account-and-billing" }><Button variant="outlined" type="button">{ t('COMMON.SELECT') }</Button></Link>
                            }
                        </div>
                    </div>
                )
            }
            </div>
          </div>
          <div className="d-flex flex-column justify-content-center align-items-center">
            <div className="d-flex flex-column" style={{ width: "80%" }}>
              {
                session.status === 'authenticated' ? 
                    <Link href={"/home"} className="text-center mb-10"><span className="title-small fw-bold text-center mb-30 primary-color cursor-pointer">{ t('PAGES.LANDING.GO_TO_APP') }</span></Link> :
                    <Link href={"/auth/register"} className="text-center mb-10"><span className="title-small fw-bold text-center mb-30 primary-color cursor-pointer">{ t('PAGES.LANDING.REGISTER') }</span></Link>
              }
              <p>
                Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vestibulum semper nunc sit amet ipsum dapibus aliquet. Duis congue, purus eget sollicitudin consectetur, erat nisi dignissim ante, eget maximus nibh nunc nec urna. Aliquam pretium vulputate urna id consequat. Pellentesque est arcu, hendrerit ut nisi ut, ultrices volutpat ligula. Sed vehicula euismod euismod. Fusce lacinia leo quis hendrerit dapibus. Aliquam vitae leo nunc. Fusce neque orci, condimentum hendrerit luctus eget, vehicula molestie lorem. Suspendisse sodales porttitor diam, ut aliquam enim mollis in. Aliquam facilisis feugiat vulputate. Class aptent taciti sociosqu ad litora torquent per conubia nostra, per inceptos himenaeos. Integer facilisis risus vel eros porttitor efficitur. Sed vel tortor ac risus laoreet venenatis at porta turpis. Fusce imperdiet sapien vel enim sagittis, sed porta ipsum accumsan. Quisque porta, orci et condimentum convallis, mauris ante convallis erat, vel aliquam tortor justo quis nisi.

                Nunc tempus, risus sed malesuada rutrum, diam odio luctus justo, id rhoncus tellus augue tincidunt purus. Pellentesque habitant morbi tristique senectus et netus et malesuada fames ac turpis egestas. In tincidunt dolor quis tortor feugiat accumsan. Vestibulum eu interdum ex, a sodales eros. Pellentesque velit ligula, accumsan ut faucibus vel, malesuada at diam. Mauris dapibus posuere congue. Mauris eu molestie ligula.

                Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vivamus eget placerat elit. Phasellus rhoncus leo urna, vitae sodales lectus mollis vel. Nunc id lectus eu tortor sodales aliquam. Duis condimentum quis ante vitae varius. Duis sagittis nisl ac metus mattis, id feugiat purus placerat. Suspendisse sagittis id augue quis tristique. Quisque sollicitudin enim vitae orci sagittis tincidunt. Mauris rhoncus in diam vitae rutrum. Mauris eu vestibulum velit. Pellentesque nec est semper, consectetur orci accumsan, varius magna. Sed tristique sed velit sit amet auctor.

                Donec est ipsum, porttitor non lacinia in, suscipit nec lacus. Nulla maximus felis in maximus efficitur. Etiam ut turpis euismod, maximus mi ut, consequat sem. Pellentesque ut ultricies lectus. Donec vehicula felis eu lectus gravida euismod. Sed lacinia vel elit ac pulvinar. Nulla fermentum mauris a est consequat, a placerat magna aliquet. Sed tempus et dui quis vehicula. Nullam semper sapien nibh, laoreet dictum nibh sagittis sit amet. Nunc suscipit ultricies neque, non rhoncus elit aliquet luctus. Integer finibus, arcu ut fermentum dapibus, lectus ipsum dignissim mauris, vel tempus augue mi at augue. Sed quis placerat lacus. Etiam nulla dui, interdum vel elementum eu, fringilla id nunc.

                Phasellus scelerisque eleifend massa, ut aliquam ante convallis non. Aliquam eget dictum ligula. Duis rutrum mollis lectus, et dignissim metus accumsan non. Phasellus posuere, dolor at efficitur bibendum, erat sapien sodales justo, at egestas dolor velit sodales odio. Suspendisse eu luctus arcu. Aliquam sed neque et ipsum molestie imperdiet placerat sed dui. Etiam et vulputate mauris. Duis dignissim dui sit amet nibh ultrices molestie sit amet et leo. Mauris pretium rhoncus erat vitae porta. Nunc tempus sollicitudin diam nec mollis. Nam convallis risus sed velit tempus, et sollicitudin purus vulputate. Sed eget nisi sed nunc aliquet commodo. Sed accumsan volutpat finibus. Etiam pretium enim quis lectus pulvinar, in accumsan mi dignissim.
              </p>
            </div>
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