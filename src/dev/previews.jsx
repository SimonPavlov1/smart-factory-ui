import {ComponentPreview, Previews} from '@react-buddy/ide-toolbox'
import {PaletteTree} from './palette'
import App from "../App.jsx";
import Sidebar from "../components/Sidebar.jsx";
import MenuItem from "../components/Sidebar.jsx";
import GadgetsBase from "../components/GadgetsBase.jsx";
import AddGadget from "../components/AddGadget.jsx";
import ProductForm from "../components/./ProductForm.jsx";
import BOMItem from "../components/GadgetsBase.jsx";
import BOMRow from "../components/GadgetsBase.jsx";

const ComponentPreviews = () => {
    return (
        <Previews palette={<PaletteTree/>}>
            <ComponentPreview path="/App">
                <App/>
            </ComponentPreview>
            <ComponentPreview path="/Sidebar">
                <Sidebar/>
            </ComponentPreview>
            <ComponentPreview path="/MenuItem">
                <MenuItem/>
            </ComponentPreview>
            <ComponentPreview path="/GadgetsBase">
                <GadgetsBase/>
            </ComponentPreview>
            <ComponentPreview path="/AddGadget">
                <AddGadget/>
            </ComponentPreview>
            <ComponentPreview path="/ProductForm">
                <ProductForm/>
            </ComponentPreview>
            <ComponentPreview path="/BOMItem">
                <BOMItem/>
            </ComponentPreview>
            <ComponentPreview path="/BOMRow">
                <BOMRow/>
            </ComponentPreview>
        </Previews>
    )
}

export default ComponentPreviews