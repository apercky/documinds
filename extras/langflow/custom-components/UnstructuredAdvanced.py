from langchain_unstructured import UnstructuredLoader

from langflow.base.data import BaseFileComponent
from langflow.inputs import (
    BoolInput,
    DropdownInput,
    MessageTextInput,
    MultiselectInput,
    NestedDictInput,
    SecretStrInput,
)
from langflow.schema import Data


class UnstructuredAdvancedComponent(BaseFileComponent):
    display_name = "Unstructured API Advanced"
    description = "Uses Unstructured.io API to extract clean text from raw source documents. Supports a wide range of file types."
    documentation = (
        "https://python.langchain.com/api_reference/unstructured/document_loaders/"
        "langchain_unstructured.document_loaders.UnstructuredLoader.html"
    )
    trace_type = "tool"
    icon = "Unstructured"
    name = "Unstructured"

    VALID_EXTENSIONS = [
        "bmp",
        "csv",
        "doc",
        "docx",
        "eml",
        "epub",
        "heic",
        "html",
        "jpeg",
        "png",
        "md",
        "msg",
        "odt",
        "org",
        "p7s",
        "pdf",
        "png",
        "ppt",
        "pptx",
        "rst",
        "rtf",
        "tiff",
        "txt",
        "tsv",
        "xls",
        "xlsx",
        "xml",
    ]

    inputs = [
        *BaseFileComponent._base_inputs,
        SecretStrInput(
            name="api_key",
            display_name="Unstructured.io Serverless API Key",
            required=True,
            info="Unstructured API Key. Create at: https://app.unstructured.io/",
        ),
        MessageTextInput(
            name="api_url",
            display_name="Unstructured.io API URL",
            required=False,
            info="Unstructured API URL.",
            value="http://localhost:8001/general/v0.0.80/general",
        ),
        DropdownInput(
            name="chunking_strategy",
            display_name="Chunking Strategy",
            info="Chunking strategy to use, see https://docs.unstructured.io/api-reference/api-services/chunking",
            options=["", "basic", "by_title", "by_page", "by_similarity"],
            real_time_refresh=False,
            value="",
        ),
        DropdownInput(
            name="strategy",
            display_name="Processing Strategy",
            options=["auto", "fast", "hi-res", "ocr-only"],
            real_time_refresh=False,
            value="fast",
            info="Select the processing strategy. 'fast' is quicker, while 'accurate' provides better results.",
        ),
        MultiselectInput(
            name="extractImageBlockTypes",
            display_name="Extract Image Block Types",
            options=["Image", "Table"],
            value=["Image", "Table"],
            info="Select the types of image-based content to extract.",
        ),
        BoolInput(
            name="multiPageSections",
            display_name="Multi-Page Sections",
            value=True,
            info="Enable multi-page section extraction.",
        ),
        MultiselectInput(
            name="ocrLanguages",
            display_name="OCR Languages",
            options=["en", "it", "fr", "de", "es", "pt", "nl"],
            value=["it", "en"],
            info="Specify the OCR languages for text extraction.",
        ),
        BoolInput(
            name="coordinates",
            display_name="Include Coordinates",
            value=True,
            info="Enable coordinate extraction for detected elements.",
        ),
        NestedDictInput(
            name="unstructured_args",
            display_name="Additional Arguments",
            required=False,
            info=(
                "Optional dictionary of additional arguments to the Loader. "
                "See https://docs.unstructured.io/api-reference/api-services/api-parameters for more information."
            ),
        ),
    ]

    outputs = [
        *BaseFileComponent._base_outputs,
    ]

    def process_files(
        self, file_list: list[BaseFileComponent.BaseFile]
    ) -> list[BaseFileComponent.BaseFile]:
        file_paths = [str(file.path) for file in file_list if file.path]

        if not file_paths:
            self.log("No files to process.")
            return file_list

        args = self.unstructured_args or {}

        if self.chunking_strategy:
            args["chunking_strategy"] = self.chunking_strategy

        args.update(
            {
                "api_key": self.api_key,
                "partition_via_api": True,
                "strategy": self.strategy,
                "extract_image_block_types": self.extractImageBlockTypes,
                "multipage_sections": self.multiPageSections,
                "ocr_languages": self.ocrLanguages,
                "coordinates": self.coordinates,
            }
        )

        if self.api_url:
            args["url"] = self.api_url

        loader = UnstructuredLoader(
            file_paths,
            **args,
        )

        documents = loader.load()
        processed_data: list[Data | None] = [
            Data.from_document(doc) if doc else None for doc in documents
        ]

        for data in processed_data:
            if data and "source" in data.data:
                data.data[self.SERVER_FILE_PATH_FIELDNAME] = data.data.pop("source")

        return self.rollup_data(file_list, processed_data)
