import ButtonCard from "@/components/buttoncard";
import { routes } from "@/lib/routes";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { useTranslation } from 'next-i18next';

export default () => {
    const { t } = useTranslation('common');
    const subpages = (routes.filter(i => i.path === "/profile")[0].subpages).filter(i => i.display === undefined || i.display);

    return (
        <div className="d-flex flex-row flex-wrap">
            {
                subpages.map(subpage => (
                    <ButtonCard key={ subpage.title } text={ t(subpage.title) } icon={ subpage.icon } url={ subpage.path }/>
                ))
            }
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