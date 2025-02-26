from copy import deepcopy

from chromadb.config import Settings
from langchain_chroma import Chroma
from typing_extensions import override

from langflow.base.vectorstores.model import (
    LCVectorStoreComponent,
    check_cached_vector_store,
)
from langflow.base.vectorstores.utils import chroma_collection_to_data
from langflow.io import BoolInput, DropdownInput, HandleInput, IntInput, StrInput
from langflow.schema import Data


class ChromaVectorStoreAdvancedComponent(LCVectorStoreComponent):
    """Chroma Vector Store with search capabilities and basic authentication."""

    display_name: str = "Chroma DB advanced"
    description: str = (
        "Chroma Vector Store with search capabilities and authentication options"
    )
    name = "Chroma DB advanced"
    icon = "Chroma"

    inputs = [
        StrInput(
            name="collection_name",
            display_name="Collection Name",
            value="langflow",
        ),
        StrInput(
            name="persist_directory",
            display_name="Persist Directory",
        ),
        *LCVectorStoreComponent.inputs,
        HandleInput(
            name="embedding", display_name="Embedding", input_types=["Embeddings"]
        ),
        DropdownInput(
            name="authentication_type",
            display_name="Authentication Type",
            options=["None", "Basic Auth"],
            value="None",
            info="Select the authentication type for your Chroma server",
        ),
        StrInput(
            name="username",
            display_name="Username",
            info="Username for basic authentication",
            advanced=True,
        ),
        StrInput(
            name="password",
            display_name="Password",
            info="Password for basic authentication",
            advanced=True,
        ),
        StrInput(
            name="chroma_server_cors_allow_origins",
            display_name="Server CORS Allow Origins",
            advanced=True,
        ),
        StrInput(
            name="chroma_server_host",
            display_name="Server Host",
            advanced=True,
        ),
        IntInput(
            name="chroma_server_http_port",
            display_name="Server HTTP Port",
            advanced=True,
        ),
        IntInput(
            name="chroma_server_grpc_port",
            display_name="Server gRPC Port",
            advanced=True,
        ),
        BoolInput(
            name="chroma_server_ssl_enabled",
            display_name="Server SSL Enabled",
            advanced=True,
        ),
        BoolInput(
            name="allow_duplicates",
            display_name="Allow Duplicates",
            advanced=True,
            info="If false, will not add documents that are already in the Vector Store.",
        ),
        DropdownInput(
            name="search_type",
            display_name="Search Type",
            options=["Similarity", "MMR"],
            value="Similarity",
            advanced=True,
        ),
        IntInput(
            name="number_of_results",
            display_name="Number of Results",
            info="Number of results to return.",
            advanced=True,
            value=10,
        ),
        IntInput(
            name="limit",
            display_name="Limit",
            advanced=True,
            info="Limit the number of records to compare when Allow Duplicates is False.",
        ),
    ]

    @override
    @check_cached_vector_store
    def build_vector_store(self) -> Chroma:
        """Builds the Chroma object."""
        try:
            from chromadb import Client, HttpClient
            from langchain_chroma import Chroma
        except ImportError as e:
            msg = "Could not import Chroma integration package. Please install it with `pip install langchain-chroma`."
            raise ImportError(msg) from e

        # Chroma settings and client
        client = None

        if self.chroma_server_host:
            # Create settings object
            chroma_settings = Settings(
                chroma_server_cors_allow_origins=self.chroma_server_cors_allow_origins
                or [],
                chroma_server_host=self.chroma_server_host,
                chroma_server_http_port=self.chroma_server_http_port or None,
                chroma_server_grpc_port=self.chroma_server_grpc_port or None,
                chroma_server_ssl_enabled=self.chroma_server_ssl_enabled,
            )

            # Handle authentication
            if (
                self.authentication_type == "Basic Auth"
                and self.username
                and self.password
            ):
                # Create basic auth headers
                import base64

                auth_string = f"{self.username}:{self.password}"
                encoded_auth = base64.b64encode(auth_string.encode()).decode()
                auth_headers = {"Authorization": f"Basic {encoded_auth}"}

                # Use HttpClient with auth headers for basic auth
                client = HttpClient(
                    host=self.chroma_server_host,
                    port=self.chroma_server_http_port,
                    ssl=self.chroma_server_ssl_enabled,
                    headers=auth_headers,
                    settings=chroma_settings,
                )
                self.log("Using basic authentication for Chroma connection.")
            else:
                # Standard client without auth
                client = Client(settings=chroma_settings)
                self.log("Using Chroma connection without authentication.")

        # Check persist_directory and expand it if it is a relative path
        persist_directory = (
            self.resolve_path(self.persist_directory)
            if self.persist_directory is not None
            else None
        )

        chroma = Chroma(
            persist_directory=persist_directory,
            client=client,
            embedding_function=self.embedding,
            collection_name=self.collection_name,
        )

        self._add_documents_to_vector_store(chroma)
        self.status = chroma_collection_to_data(chroma.get(limit=self.limit))
        return chroma

    def _add_documents_to_vector_store(self, vector_store: "Chroma") -> None:
        """Adds documents to the Vector Store."""
        if not self.ingest_data:
            self.status = ""
            return

        stored_documents_without_id = []
        if self.allow_duplicates:
            stored_data = []
        else:
            stored_data = chroma_collection_to_data(vector_store.get(limit=self.limit))
            for value in deepcopy(stored_data):
                del value.id
                stored_documents_without_id.append(value)

        documents = []
        for _input in self.ingest_data or []:
            if isinstance(_input, Data):
                if _input not in stored_documents_without_id:
                    documents.append(_input.to_lc_document())
            else:
                msg = "Vector Store Inputs must be Data objects."
                raise TypeError(msg)

        if documents and self.embedding is not None:
            self.log(f"Adding {len(documents)} documents to the Vector Store.")
            vector_store.add_documents(documents)
        else:
            self.log("No documents to add to the Vector Store.")
