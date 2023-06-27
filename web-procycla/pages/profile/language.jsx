import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import LanguageSwitcher from "@/components/layout/languageswitcher";

export default () => {
    return (
        <div className="d-flex flex-row flex-wrap">
            <LanguageSwitcher/>
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