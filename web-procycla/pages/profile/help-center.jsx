import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { useTranslation } from 'next-i18next';
import { useState, useEffect } from "react";
import Faq from "@/components/faq";
import Link from "next/link";

export default () => {
    const { t } = useTranslation('common');

    const [questions, setQuestions] = useState(null);
    useEffect(() => {
        if(questions === null) {
            setQuestions(t("FAQ.QUESTIONS", { returnObjects: true }));
        }
    }, []);

    return (
        <div className="d-flex flex-row">
            { questions && <Faq faq={ questions }/> }
            <div className="d-flex flex-column m-30 p-30" style={{ width: "300px", borderLeft: "1px solid rgba(86, 90, 92, 0.3)", height: "100%", padding: "20px" }}>
                <span className={ "text-small text-secondary fw-bold" }>{ t("FAQ.LINKS") }</span>
                <Link href={ "/projects" }><span className={ "text-small primary-color fw-normal cursor-pointer" }>{ t("ROUTES.PROJECTS.TITLE") }</span></Link>
                <Link href={ "/software" }><span className={ "text-small primary-color fw-normal cursor-pointer" }>{ t("ROUTES.SOFTWARE.TITLE") }</span></Link>
                <Link href={ "/profile/settings" }><span className={ "text-small primary-color fw-normal cursor-pointer" }>{ t("ROUTES.PROFILE.PROFILE_SETTINGS") }</span></Link>
                <Link href={ "/profile/account-and-billing" }><span className={ "text-small primary-color fw-normal cursor-pointer" }>{ t("ROUTES.PROFILE.ACCOUNT_BILLING") }</span></Link>
                <Link href={ "/profile/notifications" }><span className={ "text-small primary-color fw-normal cursor-pointer" }>{ t("ROUTES.PROFILE.SUPPORT") }</span></Link>
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