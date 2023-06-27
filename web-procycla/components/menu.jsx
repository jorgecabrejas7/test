import styles from "@/styles/menu.module.css";
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";

const Menu = ({ options, menuOptionChanged, selectedOption }) => {
    const router = useRouter();
    const [selected, setSelected] = useState(selectedOption || 0);

    const switchToMenuOption = index => {
        setSelectedWithRoute(index);
        menuOptionChanged(index);
    }

    const setSelectedWithRoute = index => {
        const { pathname, query } = router;
        router.push({ pathname, query: { ...query, menu_page: index } });
        setSelected(index);
    }

    useEffect(() => {
        if(typeof selectedOption === 'number' && selected != selectedOption)
        setSelectedWithRoute(selectedOption);
    }, [selectedOption]);
    
    
    return (
        <div className="d-flex flew-column mb-10">
            {
                options.map((option, index) => {
                    const title = typeof option === 'object' ? option.title : option;
                    const link = typeof option === 'object' ? option.link : null;

                    if(link) {
                        return (
                            <div key={ index } className="d-flex flex-column mr-10 cursor-pointer">
                                <Link href={ link } className={ "text-medium text-uppercase " + (selected === index ? 'fw-bold' : '') }>{ title }</Link>
                                { selected === index && <div className={ styles.hbar }/> }
                            </div>
                        )
                    }
                    else {
                        return (
                            <div key={ index } className="d-flex flex-column mr-10 cursor-pointer" onClick={ () => switchToMenuOption(index) }>
                                <span className={ "text-medium text-uppercase " + (selected === index ? 'fw-bold' : '') }>{ title }</span>
                                { selected === index && <div className={ styles.hbar }/> }
                            </div>
                        )
                    }
                })
            }
        </div>
    );
};

export default Menu;