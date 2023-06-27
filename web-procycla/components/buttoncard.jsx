import styles from "@/styles/buttoncard.module.css";
import Icon from '@mui/material/Icon';
import Link from "next/link";

const ButtonCard = ({ text, icon, url }) => {
    return (
        <Link href={ url } className={ styles.card }>
            <Icon className="text-light" style={{ fontSize: "80pt" }}>{ icon }</Icon>
            <span className="text-big text-light text-uppercase fw-bold text-center">{ text }</span>
        </Link>
    );
};

export default ButtonCard;