import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import Image from 'next/image';
import Link from 'next/link';

export default () => {
    const { t } = useTranslation('common');

    return (
        <div className="d-flex flex-row flex-column" style={{ maxWidth: '1300px' }}>
            <div className='d-flex flex-row justify-content-between align-items-center mb-30'>
                <span className="title-medium fw-bold primary-color text-uppercase">{ t('PAGES.SOFTWARE.TITLE') }</span>
            </div>
            <div className='d-flex flex-row mb-30'>
                <div className='d-flex flex-column' style={{ width: '400px', backgroundColor: '#40AB5D', margin: '5px' }}>
                    <div style={{ position: 'relative', width: '100%', height: '400px' }}>
                        <Image src="/img/BMP.jpg" alt="image2" fill style={{ objectFit: 'cover' }}/>
                    </div>
                    <div className='d-flex flex-column m-30'>
                        <div className='mb-20' style={{ position: 'relative', width: '50px', height: '50px' }}>
                            <Image src="/img/BMPIcono.png" alt="image2" fill style={{ objectFit: 'cover' }}/>
                        </div>
                        <div style={{ width: '100%', height: '2px', borderBottom: '2px solid white', marginBottom: '30px' }}/>
                        <span className='fw-bold title-medium text-light text-uppercase mb-10'>{ t('PAGES.SOFTWARE.BMP_MODULE') }</span>
                        <span className='text-medium text-light mb-40'>{ t('PAGES.SOFTWARE.BMP_MODULE_TEXT') }</span>

                        {/*<Link href={ "/projects" }>
                            <div className='cursor-pointer' style={{ width: '45%', border: '2px solid white', padding: '20px' }}>
                                <span className='text-medium text-light'>{ t('PAGES.SOFTWARE.SEE_MORE') }</span>
                            </div>
                        </Link>*/}
                    </div>
                </div>
                <div className='d-flex flex-column' style={{ width: '400px', backgroundColor: '#186383', margin: '5px' }}>
                    <div style={{ position: 'relative', width: '100%', height: '400px' }}>
                        <Image src="/img/CSTR.jpg" alt="image2" fill style={{ objectFit: 'cover' }}/>
                    </div>
                    <div className='d-flex flex-column m-30'>
                        <div className='mb-20' style={{ position: 'relative', width: '50px', height: '50px' }}>
                            <Image src="/img/CSTRIcono.png" alt="image2" fill style={{ objectFit: 'cover' }}/>
                        </div>
                        <div style={{ width: '100%', height: '2px', borderBottom: '2px solid white', marginBottom: '30px' }}/>
                        <span className='fw-bold title-medium text-light text-uppercase mb-10'>{ t('PAGES.SOFTWARE.CSTR_MODULE') }</span>
                        <span className='text-medium text-light mb-40'>{ t('PAGES.SOFTWARE.CSTR_MODULE_TEXT') }</span>

                        {/*<Link href={ "/projects" }>
                            <div className='cursor-pointer' style={{ width: '45%', border: '2px solid white', padding: '20px' }}>
                                <span className='text-medium text-light'>{ t('PAGES.SOFTWARE.SEE_MORE') }</span>
                            </div>
                        </Link>*/}
                    </div>
                </div>
                <div className='d-flex flex-column' style={{ width: '400px', backgroundColor: '#D48C28', margin: '5px' }}>
                    <div style={{ position: 'relative', width: '100%', height: '400px' }}>
                        <Image src="/img/BPA_MT.jpg" alt="image2" fill style={{ objectFit: 'cover' }}/>
                    </div>
                    <div className='d-flex flex-column m-30'>
                        <div className='mb-20' style={{ position: 'relative', width: '50px', height: '50px' }}>
                            <Image src="/img/BPAIcono.png" alt="image2" fill style={{ objectFit: 'cover' }}/>
                        </div>
                        <div style={{ width: '100%', height: '2px', borderBottom: '2px solid white', marginBottom: '30px' }}/>
                        <span className='fw-bold title-medium text-light text-uppercase mb-10'>{ t('PAGES.SOFTWARE.BPA_MT_MODULE') }</span>
                        <span className='text-medium text-light mb-40'>{ t('PAGES.SOFTWARE.BPA_MT_MODULE_TEXT') }</span>

                        {/*<Link href={ "/projects" }>
                            <div className='cursor-pointer' style={{ width: '45%', border: '2px solid white', padding: '20px' }}>
                                <span className='text-medium text-light'>{ t('PAGES.SOFTWARE.SEE_MORE') }</span>
                            </div>
                        </Link>*/}
                    </div>
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