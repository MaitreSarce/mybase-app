from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, Query, BackgroundTasks
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import jwt
import bcrypt
import shutil
import aiofiles
import httpx
import asyncio

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'mybase-secret-key-change-in-production')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24 * 7  # 7 days

# File upload directory
UPLOAD_DIR = ROOT_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

# Create the main app
app = FastAPI(title="MyBase - Personal Life OS")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Security
security = HTTPBearer()

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ==================== MODELS ====================

# Auth Models
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    email: str
    name: str
    created_at: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

# Base Item Model (shared fields for all entities)
class MetadataField(BaseModel):
    key: str
    value: Any
    type: str = "text"  # text, number, date, boolean, select, url

class ItemLink(BaseModel):
    item_id: str
    item_type: str  # collection, inventory, wishlist, project, content, portfolio
    label: Optional[str] = None

class FileAttachment(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    filename: str
    original_name: str
    mime_type: str
    size: int
    uploaded_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# Collection Models
class CollectionCreate(BaseModel):
    name: str
    description: Optional[str] = None
    category: Optional[str] = None
    color: Optional[str] = None
    icon: Optional[str] = None
    metadata_schema: Optional[List[Dict[str, Any]]] = []  # Define custom fields for items in this collection

class CollectionUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    color: Optional[str] = None
    icon: Optional[str] = None
    metadata_schema: Optional[List[Dict[str, Any]]] = None

class CollectionResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    user_id: str
    name: str
    description: Optional[str] = None
    category: Optional[str] = None
    color: Optional[str] = None
    icon: Optional[str] = None
    metadata_schema: List[Dict[str, Any]] = []
    item_count: int = 0
    created_at: str
    updated_at: str

# Inventory Item Models
class InventoryItemCreate(BaseModel):
    name: str
    description: Optional[str] = None
    collection_id: Optional[str] = None
    tags: List[str] = []
    metadata: List[MetadataField] = []
    links: List[ItemLink] = []
    purchase_price: Optional[float] = None
    current_value: Optional[float] = None
    purchase_date: Optional[str] = None
    location: Optional[str] = None
    condition: Optional[str] = None
    quantity: int = 1

class InventoryItemUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    collection_id: Optional[str] = None
    tags: Optional[List[str]] = None
    metadata: Optional[List[MetadataField]] = None
    links: Optional[List[ItemLink]] = None
    purchase_price: Optional[float] = None
    current_value: Optional[float] = None
    purchase_date: Optional[str] = None
    location: Optional[str] = None
    condition: Optional[str] = None
    quantity: Optional[int] = None

class InventoryItemResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    user_id: str
    name: str
    description: Optional[str] = None
    collection_id: Optional[str] = None
    tags: List[str] = []
    metadata: List[Dict[str, Any]] = []
    links: List[Dict[str, Any]] = []
    attachments: List[Dict[str, Any]] = []
    purchase_price: Optional[float] = None
    current_value: Optional[float] = None
    purchase_date: Optional[str] = None
    location: Optional[str] = None
    condition: Optional[str] = None
    quantity: int = 1
    created_at: str
    updated_at: str

# Wishlist Models
class WishlistItemCreate(BaseModel):
    name: str
    description: Optional[str] = None
    url: Optional[str] = None
    price: Optional[float] = None
    currency: str = "EUR"
    priority: int = 3  # 1-5
    tags: List[str] = []
    metadata: List[MetadataField] = []
    links: List[ItemLink] = []
    target_date: Optional[str] = None
    collection_id: Optional[str] = None

class WishlistItemUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    url: Optional[str] = None
    price: Optional[float] = None
    currency: Optional[str] = None
    priority: Optional[int] = None
    tags: Optional[List[str]] = None
    metadata: Optional[List[MetadataField]] = None
    links: Optional[List[ItemLink]] = None
    target_date: Optional[str] = None
    purchased: Optional[bool] = None
    collection_id: Optional[str] = None

class WishlistItemResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    user_id: str
    name: str
    description: Optional[str] = None
    url: Optional[str] = None
    price: Optional[float] = None
    currency: str = "EUR"
    priority: int = 3
    tags: List[str] = []
    metadata: List[Dict[str, Any]] = []
    links: List[Dict[str, Any]] = []
    attachments: List[Dict[str, Any]] = []
    target_date: Optional[str] = None
    purchased: bool = False
    collection_id: Optional[str] = None
    created_at: str
    updated_at: str

# Project/Task Models
class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    project_id: Optional[str] = None
    due_date: Optional[str] = None
    priority: int = 3
    tags: List[str] = []
    links: List[ItemLink] = []

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    project_id: Optional[str] = None
    due_date: Optional[str] = None
    priority: Optional[int] = None
    completed: Optional[bool] = None
    tags: Optional[List[str]] = None
    links: Optional[List[ItemLink]] = None

class TaskResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    user_id: str
    title: str
    description: Optional[str] = None
    project_id: Optional[str] = None
    due_date: Optional[str] = None
    priority: int = 3
    completed: bool = False
    tags: List[str] = []
    links: List[Dict[str, Any]] = []
    created_at: str
    updated_at: str

class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = None
    color: Optional[str] = None
    icon: Optional[str] = None
    parent_id: Optional[str] = None
    tags: List[str] = []
    links: List[ItemLink] = []

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    color: Optional[str] = None
    icon: Optional[str] = None
    parent_id: Optional[str] = None
    status: Optional[str] = None
    tags: Optional[List[str]] = None
    links: Optional[List[ItemLink]] = None

class ProjectResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    user_id: str
    name: str
    description: Optional[str] = None
    color: Optional[str] = None
    icon: Optional[str] = None
    parent_id: Optional[str] = None
    status: str = "active"
    tags: List[str] = []
    links: List[Dict[str, Any]] = []
    task_count: int = 0
    completed_tasks: int = 0
    created_at: str
    updated_at: str

# Content Models (Recipes, DIY, Tutorials)
class ContentCreate(BaseModel):
    title: str
    content_type: str  # recipe, diy, tutorial, educational
    description: Optional[str] = None
    body: Optional[str] = None  # Markdown content
    tags: List[str] = []
    metadata: List[MetadataField] = []
    links: List[ItemLink] = []
    category: Optional[str] = None

class ContentUpdate(BaseModel):
    title: Optional[str] = None
    content_type: Optional[str] = None
    description: Optional[str] = None
    body: Optional[str] = None
    tags: Optional[List[str]] = None
    metadata: Optional[List[MetadataField]] = None
    links: Optional[List[ItemLink]] = None
    category: Optional[str] = None

class ContentResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    user_id: str
    title: str
    content_type: str
    description: Optional[str] = None
    body: Optional[str] = None
    tags: List[str] = []
    metadata: List[Dict[str, Any]] = []
    links: List[Dict[str, Any]] = []
    attachments: List[Dict[str, Any]] = []
    category: Optional[str] = None
    created_at: str
    updated_at: str

# Portfolio Models
class PortfolioAssetCreate(BaseModel):
    name: str
    asset_type: str  # crypto, stock, real_estate, other
    symbol: Optional[str] = None  # BTC, AAPL, etc.
    quantity: float
    purchase_price: float
    purchase_date: Optional[str] = None
    currency: str = "EUR"
    tags: List[str] = []
    metadata: List[MetadataField] = []
    links: List[ItemLink] = []
    notes: Optional[str] = None

class PortfolioAssetUpdate(BaseModel):
    name: Optional[str] = None
    asset_type: Optional[str] = None
    symbol: Optional[str] = None
    quantity: Optional[float] = None
    purchase_price: Optional[float] = None
    purchase_date: Optional[str] = None
    currency: Optional[str] = None
    current_price: Optional[float] = None
    tags: Optional[List[str]] = None
    metadata: Optional[List[MetadataField]] = None
    links: Optional[List[ItemLink]] = None
    notes: Optional[str] = None

class PortfolioAssetResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    user_id: str
    name: str
    asset_type: str
    symbol: Optional[str] = None
    quantity: float
    purchase_price: float
    purchase_date: Optional[str] = None
    currency: str = "EUR"
    current_price: Optional[float] = None
    tags: List[str] = []
    metadata: List[Dict[str, Any]] = []
    links: List[Dict[str, Any]] = []
    attachments: List[Dict[str, Any]] = []
    notes: Optional[str] = None
    created_at: str
    updated_at: str

# ==================== AUTH HELPERS ====================

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(user_id: str) -> str:
    payload = {
        "user_id": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("user_id")
        if not user_id:
            raise HTTPException(status_code=401, detail="Token invalide")
        
        user = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
        if not user:
            raise HTTPException(status_code=401, detail="Utilisateur non trouvé")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expiré")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token invalide")

# ==================== AUTH ROUTES ====================

@api_router.post("/auth/register", response_model=TokenResponse)
async def register(user_data: UserCreate):
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Cet email est déjà utilisé")
    
    user_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    user_doc = {
        "id": user_id,
        "email": user_data.email,
        "password": hash_password(user_data.password),
        "name": user_data.name,
        "created_at": now,
        "updated_at": now
    }
    
    await db.users.insert_one(user_doc)
    
    token = create_token(user_id)
    return TokenResponse(
        access_token=token,
        user=UserResponse(id=user_id, email=user_data.email, name=user_data.name, created_at=now)
    )

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email})
    if not user or not verify_password(credentials.password, user["password"]):
        raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect")
    
    token = create_token(user["id"])
    return TokenResponse(
        access_token=token,
        user=UserResponse(id=user["id"], email=user["email"], name=user["name"], created_at=user["created_at"])
    )

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(user: dict = Depends(get_current_user)):
    return UserResponse(**user)

# ==================== COLLECTIONS ROUTES ====================

@api_router.post("/collections", response_model=CollectionResponse)
async def create_collection(data: CollectionCreate, user: dict = Depends(get_current_user)):
    collection_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    doc = {
        "id": collection_id,
        "user_id": user["id"],
        **data.model_dump(),
        "item_count": 0,
        "created_at": now,
        "updated_at": now
    }
    
    await db.collections.insert_one(doc)
    doc.pop("_id", None)
    return CollectionResponse(**doc)

@api_router.get("/collections", response_model=List[CollectionResponse])
async def get_collections(user: dict = Depends(get_current_user)):
    collections = await db.collections.find({"user_id": user["id"]}, {"_id": 0}).to_list(1000)
    return [CollectionResponse(**c) for c in collections]

@api_router.get("/collections/{collection_id}", response_model=CollectionResponse)
async def get_collection(collection_id: str, user: dict = Depends(get_current_user)):
    collection = await db.collections.find_one({"id": collection_id, "user_id": user["id"]}, {"_id": 0})
    if not collection:
        raise HTTPException(status_code=404, detail="Collection non trouvée")
    return CollectionResponse(**collection)

@api_router.put("/collections/{collection_id}", response_model=CollectionResponse)
async def update_collection(collection_id: str, data: CollectionUpdate, user: dict = Depends(get_current_user)):
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.collections.find_one_and_update(
        {"id": collection_id, "user_id": user["id"]},
        {"$set": update_data},
        return_document=True
    )
    if not result:
        raise HTTPException(status_code=404, detail="Collection non trouvée")
    result.pop("_id", None)
    return CollectionResponse(**result)

@api_router.delete("/collections/{collection_id}")
async def delete_collection(collection_id: str, user: dict = Depends(get_current_user)):
    result = await db.collections.delete_one({"id": collection_id, "user_id": user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Collection non trouvée")
    return {"message": "Collection supprimée"}

# ==================== INVENTORY ROUTES ====================

@api_router.post("/inventory", response_model=InventoryItemResponse)
async def create_inventory_item(data: InventoryItemCreate, user: dict = Depends(get_current_user)):
    item_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    doc = {
        "id": item_id,
        "user_id": user["id"],
        "name": data.name,
        "description": data.description,
        "collection_id": data.collection_id,
        "tags": data.tags,
        "metadata": [m.model_dump() for m in data.metadata],
        "links": [l.model_dump() for l in data.links],
        "attachments": [],
        "purchase_price": data.purchase_price,
        "current_value": data.current_value,
        "purchase_date": data.purchase_date,
        "location": data.location,
        "condition": data.condition,
        "quantity": data.quantity,
        "created_at": now,
        "updated_at": now
    }
    
    await db.inventory.insert_one(doc)
    
    # Update collection item count
    if data.collection_id:
        await db.collections.update_one(
            {"id": data.collection_id, "user_id": user["id"]},
            {"$inc": {"item_count": 1}}
        )
    
    doc.pop("_id", None)
    return InventoryItemResponse(**doc)

@api_router.get("/inventory", response_model=List[InventoryItemResponse])
async def get_inventory_items(
    user: dict = Depends(get_current_user),
    collection_id: Optional[str] = None,
    tags: Optional[str] = None,
    search: Optional[str] = None
):
    query = {"user_id": user["id"]}
    if collection_id:
        query["collection_id"] = collection_id
    if tags:
        query["tags"] = {"$in": tags.split(",")}
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}}
        ]
    
    items = await db.inventory.find(query, {"_id": 0}).to_list(1000)
    return [InventoryItemResponse(**item) for item in items]

@api_router.get("/inventory/{item_id}", response_model=InventoryItemResponse)
async def get_inventory_item(item_id: str, user: dict = Depends(get_current_user)):
    item = await db.inventory.find_one({"id": item_id, "user_id": user["id"]}, {"_id": 0})
    if not item:
        raise HTTPException(status_code=404, detail="Item non trouvé")
    return InventoryItemResponse(**item)

@api_router.put("/inventory/{item_id}", response_model=InventoryItemResponse)
async def update_inventory_item(item_id: str, data: InventoryItemUpdate, user: dict = Depends(get_current_user)):
    update_data = {}
    for k, v in data.model_dump().items():
        if v is not None:
            if k == "metadata":
                update_data[k] = [m.model_dump() if hasattr(m, 'model_dump') else m for m in v]
            elif k == "links":
                update_data[k] = [l.model_dump() if hasattr(l, 'model_dump') else l for l in v]
            else:
                update_data[k] = v
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.inventory.find_one_and_update(
        {"id": item_id, "user_id": user["id"]},
        {"$set": update_data},
        return_document=True
    )
    if not result:
        raise HTTPException(status_code=404, detail="Item non trouvé")
    result.pop("_id", None)
    return InventoryItemResponse(**result)

@api_router.delete("/inventory/{item_id}")
async def delete_inventory_item(item_id: str, user: dict = Depends(get_current_user)):
    item = await db.inventory.find_one({"id": item_id, "user_id": user["id"]})
    if not item:
        raise HTTPException(status_code=404, detail="Item non trouvé")
    
    await db.inventory.delete_one({"id": item_id})
    
    # Update collection item count
    if item.get("collection_id"):
        await db.collections.update_one(
            {"id": item["collection_id"], "user_id": user["id"]},
            {"$inc": {"item_count": -1}}
        )
    
    return {"message": "Item supprimé"}

# ==================== WISHLIST ROUTES ====================

@api_router.post("/wishlist", response_model=WishlistItemResponse)
async def create_wishlist_item(data: WishlistItemCreate, user: dict = Depends(get_current_user)):
    item_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    doc = {
        "id": item_id,
        "user_id": user["id"],
        "name": data.name,
        "description": data.description,
        "url": data.url,
        "price": data.price,
        "currency": data.currency,
        "priority": data.priority,
        "tags": data.tags,
        "metadata": [m.model_dump() for m in data.metadata],
        "links": [l.model_dump() for l in data.links],
        "attachments": [],
        "target_date": data.target_date,
        "purchased": False,
        "created_at": now,
        "updated_at": now
    }
    
    await db.wishlist.insert_one(doc)
    doc.pop("_id", None)
    return WishlistItemResponse(**doc)

@api_router.get("/wishlist", response_model=List[WishlistItemResponse])
async def get_wishlist_items(
    user: dict = Depends(get_current_user),
    purchased: Optional[bool] = None,
    priority: Optional[int] = None
):
    query = {"user_id": user["id"]}
    if purchased is not None:
        query["purchased"] = purchased
    if priority:
        query["priority"] = priority
    
    items = await db.wishlist.find(query, {"_id": 0}).to_list(1000)
    return [WishlistItemResponse(**item) for item in items]

@api_router.get("/wishlist/{item_id}", response_model=WishlistItemResponse)
async def get_wishlist_item(item_id: str, user: dict = Depends(get_current_user)):
    item = await db.wishlist.find_one({"id": item_id, "user_id": user["id"]}, {"_id": 0})
    if not item:
        raise HTTPException(status_code=404, detail="Item non trouvé")
    return WishlistItemResponse(**item)

@api_router.put("/wishlist/{item_id}", response_model=WishlistItemResponse)
async def update_wishlist_item(item_id: str, data: WishlistItemUpdate, user: dict = Depends(get_current_user)):
    update_data = {}
    for k, v in data.model_dump().items():
        if v is not None:
            if k == "metadata":
                update_data[k] = [m.model_dump() if hasattr(m, 'model_dump') else m for m in v]
            elif k == "links":
                update_data[k] = [l.model_dump() if hasattr(l, 'model_dump') else l for l in v]
            else:
                update_data[k] = v
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.wishlist.find_one_and_update(
        {"id": item_id, "user_id": user["id"]},
        {"$set": update_data},
        return_document=True
    )
    if not result:
        raise HTTPException(status_code=404, detail="Item non trouvé")
    result.pop("_id", None)
    return WishlistItemResponse(**result)

@api_router.delete("/wishlist/{item_id}")
async def delete_wishlist_item(item_id: str, user: dict = Depends(get_current_user)):
    result = await db.wishlist.delete_one({"id": item_id, "user_id": user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Item non trouvé")
    return {"message": "Item supprimé"}

# ==================== PROJECTS/TASKS ROUTES ====================

@api_router.post("/projects", response_model=ProjectResponse)
async def create_project(data: ProjectCreate, user: dict = Depends(get_current_user)):
    project_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    doc = {
        "id": project_id,
        "user_id": user["id"],
        "name": data.name,
        "description": data.description,
        "color": data.color,
        "icon": data.icon,
        "parent_id": data.parent_id,
        "status": "active",
        "tags": data.tags,
        "links": [l.model_dump() for l in data.links],
        "task_count": 0,
        "completed_tasks": 0,
        "created_at": now,
        "updated_at": now
    }
    
    await db.projects.insert_one(doc)
    doc.pop("_id", None)
    return ProjectResponse(**doc)

@api_router.get("/projects", response_model=List[ProjectResponse])
async def get_projects(user: dict = Depends(get_current_user), status: Optional[str] = None):
    query = {"user_id": user["id"]}
    if status:
        query["status"] = status
    
    projects = await db.projects.find(query, {"_id": 0}).to_list(1000)
    return [ProjectResponse(**p) for p in projects]

@api_router.get("/projects/{project_id}", response_model=ProjectResponse)
async def get_project(project_id: str, user: dict = Depends(get_current_user)):
    project = await db.projects.find_one({"id": project_id, "user_id": user["id"]}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Projet non trouvé")
    return ProjectResponse(**project)

@api_router.put("/projects/{project_id}", response_model=ProjectResponse)
async def update_project(project_id: str, data: ProjectUpdate, user: dict = Depends(get_current_user)):
    update_data = {}
    for k, v in data.model_dump().items():
        if v is not None:
            if k == "links":
                update_data[k] = [l.model_dump() if hasattr(l, 'model_dump') else l for l in v]
            else:
                update_data[k] = v
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.projects.find_one_and_update(
        {"id": project_id, "user_id": user["id"]},
        {"$set": update_data},
        return_document=True
    )
    if not result:
        raise HTTPException(status_code=404, detail="Projet non trouvé")
    result.pop("_id", None)
    return ProjectResponse(**result)

@api_router.delete("/projects/{project_id}")
async def delete_project(project_id: str, user: dict = Depends(get_current_user)):
    result = await db.projects.delete_one({"id": project_id, "user_id": user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Projet non trouvé")
    # Also delete associated tasks
    await db.tasks.delete_many({"project_id": project_id, "user_id": user["id"]})
    return {"message": "Projet supprimé"}

@api_router.post("/tasks", response_model=TaskResponse)
async def create_task(data: TaskCreate, user: dict = Depends(get_current_user)):
    task_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    doc = {
        "id": task_id,
        "user_id": user["id"],
        "title": data.title,
        "description": data.description,
        "project_id": data.project_id,
        "due_date": data.due_date,
        "priority": data.priority,
        "completed": False,
        "tags": data.tags,
        "links": [l.model_dump() for l in data.links],
        "created_at": now,
        "updated_at": now
    }
    
    await db.tasks.insert_one(doc)
    
    # Update project task count
    if data.project_id:
        await db.projects.update_one(
            {"id": data.project_id, "user_id": user["id"]},
            {"$inc": {"task_count": 1}}
        )
    
    doc.pop("_id", None)
    return TaskResponse(**doc)

@api_router.get("/tasks", response_model=List[TaskResponse])
async def get_tasks(
    user: dict = Depends(get_current_user),
    project_id: Optional[str] = None,
    completed: Optional[bool] = None
):
    query = {"user_id": user["id"]}
    if project_id:
        query["project_id"] = project_id
    if completed is not None:
        query["completed"] = completed
    
    tasks = await db.tasks.find(query, {"_id": 0}).to_list(1000)
    return [TaskResponse(**t) for t in tasks]

@api_router.get("/tasks/{task_id}", response_model=TaskResponse)
async def get_task(task_id: str, user: dict = Depends(get_current_user)):
    task = await db.tasks.find_one({"id": task_id, "user_id": user["id"]}, {"_id": 0})
    if not task:
        raise HTTPException(status_code=404, detail="Tâche non trouvée")
    return TaskResponse(**task)

@api_router.put("/tasks/{task_id}", response_model=TaskResponse)
async def update_task(task_id: str, data: TaskUpdate, user: dict = Depends(get_current_user)):
    old_task = await db.tasks.find_one({"id": task_id, "user_id": user["id"]})
    if not old_task:
        raise HTTPException(status_code=404, detail="Tâche non trouvée")
    
    update_data = {}
    for k, v in data.model_dump().items():
        if v is not None:
            if k == "links":
                update_data[k] = [l.model_dump() if hasattr(l, 'model_dump') else l for l in v]
            else:
                update_data[k] = v
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    # Handle completion status change
    if "completed" in update_data and old_task.get("project_id"):
        if update_data["completed"] and not old_task.get("completed"):
            await db.projects.update_one(
                {"id": old_task["project_id"]},
                {"$inc": {"completed_tasks": 1}}
            )
        elif not update_data["completed"] and old_task.get("completed"):
            await db.projects.update_one(
                {"id": old_task["project_id"]},
                {"$inc": {"completed_tasks": -1}}
            )
    
    result = await db.tasks.find_one_and_update(
        {"id": task_id, "user_id": user["id"]},
        {"$set": update_data},
        return_document=True
    )
    result.pop("_id", None)
    return TaskResponse(**result)

@api_router.delete("/tasks/{task_id}")
async def delete_task(task_id: str, user: dict = Depends(get_current_user)):
    task = await db.tasks.find_one({"id": task_id, "user_id": user["id"]})
    if not task:
        raise HTTPException(status_code=404, detail="Tâche non trouvée")
    
    await db.tasks.delete_one({"id": task_id})
    
    if task.get("project_id"):
        inc_data = {"task_count": -1}
        if task.get("completed"):
            inc_data["completed_tasks"] = -1
        await db.projects.update_one(
            {"id": task["project_id"]},
            {"$inc": inc_data}
        )
    
    return {"message": "Tâche supprimée"}

# ==================== CONTENT ROUTES ====================

@api_router.post("/content", response_model=ContentResponse)
async def create_content(data: ContentCreate, user: dict = Depends(get_current_user)):
    content_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    doc = {
        "id": content_id,
        "user_id": user["id"],
        "title": data.title,
        "content_type": data.content_type,
        "description": data.description,
        "body": data.body,
        "tags": data.tags,
        "metadata": [m.model_dump() for m in data.metadata],
        "links": [l.model_dump() for l in data.links],
        "attachments": [],
        "category": data.category,
        "created_at": now,
        "updated_at": now
    }
    
    await db.content.insert_one(doc)
    doc.pop("_id", None)
    return ContentResponse(**doc)

@api_router.get("/content", response_model=List[ContentResponse])
async def get_content_items(
    user: dict = Depends(get_current_user),
    content_type: Optional[str] = None,
    category: Optional[str] = None,
    search: Optional[str] = None
):
    query = {"user_id": user["id"]}
    if content_type:
        query["content_type"] = content_type
    if category:
        query["category"] = category
    if search:
        query["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}}
        ]
    
    items = await db.content.find(query, {"_id": 0}).to_list(1000)
    return [ContentResponse(**item) for item in items]

@api_router.get("/content/{content_id}", response_model=ContentResponse)
async def get_content_item(content_id: str, user: dict = Depends(get_current_user)):
    item = await db.content.find_one({"id": content_id, "user_id": user["id"]}, {"_id": 0})
    if not item:
        raise HTTPException(status_code=404, detail="Contenu non trouvé")
    return ContentResponse(**item)

@api_router.put("/content/{content_id}", response_model=ContentResponse)
async def update_content(content_id: str, data: ContentUpdate, user: dict = Depends(get_current_user)):
    update_data = {}
    for k, v in data.model_dump().items():
        if v is not None:
            if k == "metadata":
                update_data[k] = [m.model_dump() if hasattr(m, 'model_dump') else m for m in v]
            elif k == "links":
                update_data[k] = [l.model_dump() if hasattr(l, 'model_dump') else l for l in v]
            else:
                update_data[k] = v
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.content.find_one_and_update(
        {"id": content_id, "user_id": user["id"]},
        {"$set": update_data},
        return_document=True
    )
    if not result:
        raise HTTPException(status_code=404, detail="Contenu non trouvé")
    result.pop("_id", None)
    return ContentResponse(**result)

@api_router.delete("/content/{content_id}")
async def delete_content(content_id: str, user: dict = Depends(get_current_user)):
    result = await db.content.delete_one({"id": content_id, "user_id": user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Contenu non trouvé")
    return {"message": "Contenu supprimé"}

# ==================== PORTFOLIO ROUTES ====================

@api_router.post("/portfolio", response_model=PortfolioAssetResponse)
async def create_portfolio_asset(data: PortfolioAssetCreate, user: dict = Depends(get_current_user)):
    asset_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    doc = {
        "id": asset_id,
        "user_id": user["id"],
        "name": data.name,
        "asset_type": data.asset_type,
        "symbol": data.symbol,
        "quantity": data.quantity,
        "purchase_price": data.purchase_price,
        "purchase_date": data.purchase_date,
        "currency": data.currency,
        "current_price": None,
        "tags": data.tags,
        "metadata": [m.model_dump() for m in data.metadata],
        "links": [l.model_dump() for l in data.links],
        "attachments": [],
        "notes": data.notes,
        "created_at": now,
        "updated_at": now
    }
    
    await db.portfolio.insert_one(doc)
    doc.pop("_id", None)
    return PortfolioAssetResponse(**doc)

@api_router.get("/portfolio", response_model=List[PortfolioAssetResponse])
async def get_portfolio_assets(
    user: dict = Depends(get_current_user),
    asset_type: Optional[str] = None
):
    query = {"user_id": user["id"]}
    if asset_type:
        query["asset_type"] = asset_type
    
    assets = await db.portfolio.find(query, {"_id": 0}).to_list(1000)
    return [PortfolioAssetResponse(**asset) for asset in assets]

# --- Portfolio Transactions (MUST be before {asset_id} routes) ---

class TransactionCreate(BaseModel):
    asset_id: str
    transaction_type: str
    quantity: float
    price_per_unit: float
    date: Optional[str] = None
    fees: Optional[float] = 0
    notes: Optional[str] = None

class TransactionResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    user_id: str
    asset_id: str
    asset_name: Optional[str] = None
    transaction_type: str
    quantity: float
    price_per_unit: float
    total: float
    fees: float = 0
    date: str
    notes: Optional[str] = None
    created_at: str

@api_router.post("/portfolio/transactions", response_model=TransactionResponse)
async def create_transaction(data: TransactionCreate, user: dict = Depends(get_current_user)):
    asset = await db.portfolio.find_one({"id": data.asset_id, "user_id": user["id"]}, {"_id": 0})
    if not asset:
        raise HTTPException(status_code=404, detail="Actif non trouvé")
    tx_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    total = data.quantity * data.price_per_unit
    doc = {
        "id": tx_id, "user_id": user["id"], "asset_id": data.asset_id,
        "asset_name": asset.get("name", ""), "transaction_type": data.transaction_type,
        "quantity": data.quantity, "price_per_unit": data.price_per_unit,
        "total": total, "fees": data.fees or 0,
        "date": data.date or now[:10], "notes": data.notes, "created_at": now
    }
    await db.portfolio_transactions.insert_one(doc)
    doc.pop("_id", None)
    if data.transaction_type == "buy":
        await db.portfolio.update_one({"id": data.asset_id}, {"$inc": {"quantity": data.quantity}})
    elif data.transaction_type == "sell":
        await db.portfolio.update_one({"id": data.asset_id}, {"$inc": {"quantity": -data.quantity}})
    return TransactionResponse(**doc)

@api_router.get("/portfolio/transactions", response_model=List[TransactionResponse])
async def get_transactions(user: dict = Depends(get_current_user), asset_id: Optional[str] = None):
    query = {"user_id": user["id"]}
    if asset_id:
        query["asset_id"] = asset_id
    txs = await db.portfolio_transactions.find(query, {"_id": 0}).sort("date", -1).to_list(1000)
    return [TransactionResponse(**tx) for tx in txs]

@api_router.delete("/portfolio/transactions/{tx_id}")
async def delete_transaction(tx_id: str, user: dict = Depends(get_current_user)):
    result = await db.portfolio_transactions.delete_one({"id": tx_id, "user_id": user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Transaction non trouvée")
    return {"message": "Transaction supprimée"}

@api_router.post("/portfolio/snapshots")
async def create_portfolio_snapshot(data: dict = None, user: dict = Depends(get_current_user)):
    assets = await db.portfolio.find({"user_id": user["id"]}, {"_id": 0}).to_list(1000)
    total_value = 0
    by_type = {}
    for asset in assets:
        current = (asset.get("current_price") or asset.get("purchase_price", 0)) * asset.get("quantity", 0)
        total_value += current
        at = asset.get("asset_type", "other")
        by_type[at] = by_type.get(at, 0) + current
    now = datetime.now(timezone.utc)
    snap_id = str(uuid.uuid4())
    doc = {
        "id": snap_id, "user_id": user["id"], "date": now.strftime("%Y-%m-%d"),
        "month": now.strftime("%Y-%m"), "total_value": total_value,
        "by_type": by_type, "asset_count": len(assets), "created_at": now.isoformat()
    }
    await db.portfolio_snapshots.update_one(
        {"user_id": user["id"], "date": doc["date"]}, {"$set": doc}, upsert=True
    )
    return {"message": "Snapshot créé", "total_value": total_value}

@api_router.get("/portfolio/snapshots")
async def get_portfolio_snapshots(user: dict = Depends(get_current_user), months: int = 12):
    cutoff = (datetime.now(timezone.utc) - timedelta(days=months * 30)).strftime("%Y-%m-%d")
    snapshots = await db.portfolio_snapshots.find(
        {"user_id": user["id"], "date": {"$gte": cutoff}}, {"_id": 0}
    ).sort("date", 1).to_list(1000)
    return snapshots

@api_router.get("/portfolio/refresh-prices")
async def refresh_prices_get(user: dict = Depends(get_current_user)):
    """Redirect GET to POST for convenience"""
    raise HTTPException(status_code=405, detail="Use POST method")

# --- End of portfolio sub-routes ---

@api_router.get("/portfolio/{asset_id}", response_model=PortfolioAssetResponse)
async def get_portfolio_asset(asset_id: str, user: dict = Depends(get_current_user)):
    asset = await db.portfolio.find_one({"id": asset_id, "user_id": user["id"]}, {"_id": 0})
    if not asset:
        raise HTTPException(status_code=404, detail="Actif non trouvé")
    return PortfolioAssetResponse(**asset)

@api_router.put("/portfolio/{asset_id}", response_model=PortfolioAssetResponse)
async def update_portfolio_asset(asset_id: str, data: PortfolioAssetUpdate, user: dict = Depends(get_current_user)):
    update_data = {}
    for k, v in data.model_dump().items():
        if v is not None:
            if k == "metadata":
                update_data[k] = [m.model_dump() if hasattr(m, 'model_dump') else m for m in v]
            elif k == "links":
                update_data[k] = [l.model_dump() if hasattr(l, 'model_dump') else l for l in v]
            else:
                update_data[k] = v
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.portfolio.find_one_and_update(
        {"id": asset_id, "user_id": user["id"]},
        {"$set": update_data},
        return_document=True
    )
    if not result:
        raise HTTPException(status_code=404, detail="Actif non trouvé")
    result.pop("_id", None)
    return PortfolioAssetResponse(**result)

@api_router.delete("/portfolio/{asset_id}")
async def delete_portfolio_asset(asset_id: str, user: dict = Depends(get_current_user)):
    result = await db.portfolio.delete_one({"id": asset_id, "user_id": user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Actif non trouvé")
    return {"message": "Actif supprimé"}

# ==================== FILE UPLOAD ROUTES ====================

@api_router.post("/upload/{item_type}/{item_id}")
async def upload_file(
    item_type: str,
    item_id: str,
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user)
):
    # Validate item type
    collection_map = {
        "inventory": db.inventory,
        "wishlist": db.wishlist,
        "content": db.content,
        "portfolio": db.portfolio,
        "project": db.projects,
        "task": db.tasks
    }
    
    if item_type not in collection_map:
        raise HTTPException(status_code=400, detail="Type d'item invalide")
    
    # Check if item exists
    collection = collection_map[item_type]
    item = await collection.find_one({"id": item_id, "user_id": user["id"]})
    if not item:
        raise HTTPException(status_code=404, detail="Item non trouvé")
    
    # Save file
    file_id = str(uuid.uuid4())
    file_ext = Path(file.filename).suffix
    filename = f"{file_id}{file_ext}"
    file_path = UPLOAD_DIR / filename
    
    async with aiofiles.open(file_path, 'wb') as out_file:
        content = await file.read()
        await out_file.write(content)
    
    attachment = {
        "id": file_id,
        "filename": filename,
        "original_name": file.filename,
        "mime_type": file.content_type,
        "size": len(content),
        "uploaded_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Add attachment to item
    await collection.update_one(
        {"id": item_id},
        {"$push": {"attachments": attachment}}
    )
    
    return attachment

@api_router.delete("/upload/{item_type}/{item_id}/{file_id}")
async def delete_file(
    item_type: str,
    item_id: str,
    file_id: str,
    user: dict = Depends(get_current_user)
):
    collection_map = {
        "inventory": db.inventory,
        "wishlist": db.wishlist,
        "content": db.content,
        "portfolio": db.portfolio
    }
    
    if item_type not in collection_map:
        raise HTTPException(status_code=400, detail="Type d'item invalide")
    
    collection = collection_map[item_type]
    item = await collection.find_one({"id": item_id, "user_id": user["id"]})
    if not item:
        raise HTTPException(status_code=404, detail="Item non trouvé")
    
    # Find and delete file
    attachment = next((a for a in item.get("attachments", []) if a["id"] == file_id), None)
    if not attachment:
        raise HTTPException(status_code=404, detail="Fichier non trouvé")
    
    file_path = UPLOAD_DIR / attachment["filename"]
    if file_path.exists():
        file_path.unlink()
    
    # Remove from item
    await collection.update_one(
        {"id": item_id},
        {"$pull": {"attachments": {"id": file_id}}}
    )
    
    return {"message": "Fichier supprimé"}

# ==================== DASHBOARD/STATS ROUTES ====================

@api_router.get("/dashboard/stats")
async def get_dashboard_stats(user: dict = Depends(get_current_user)):
    user_id = user["id"]
    
    # Get counts
    collections_count = await db.collections.count_documents({"user_id": user_id})
    inventory_count = await db.inventory.count_documents({"user_id": user_id})
    wishlist_count = await db.wishlist.count_documents({"user_id": user_id, "purchased": False})
    projects_count = await db.projects.count_documents({"user_id": user_id, "status": "active"})
    tasks_pending = await db.tasks.count_documents({"user_id": user_id, "completed": False})
    content_count = await db.content.count_documents({"user_id": user_id})
    portfolio_count = await db.portfolio.count_documents({"user_id": user_id})
    
    # Calculate portfolio value
    portfolio_assets = await db.portfolio.find({"user_id": user_id}, {"_id": 0}).to_list(1000)
    total_invested = sum(a.get("purchase_price", 0) * a.get("quantity", 0) for a in portfolio_assets)
    total_current = sum((a.get("current_price") or a.get("purchase_price", 0)) * a.get("quantity", 0) for a in portfolio_assets)
    
    # Calculate inventory value
    inventory_items = await db.inventory.find({"user_id": user_id}, {"_id": 0}).to_list(1000)
    inventory_value = sum(i.get("current_value") or i.get("purchase_price", 0) or 0 for i in inventory_items)
    
    # Calculate wishlist total
    wishlist_items = await db.wishlist.find({"user_id": user_id, "purchased": False}, {"_id": 0}).to_list(1000)
    wishlist_total = sum(w.get("price", 0) or 0 for w in wishlist_items)
    
    return {
        "collections": collections_count,
        "inventory": inventory_count,
        "wishlist": wishlist_count,
        "projects": projects_count,
        "tasks_pending": tasks_pending,
        "content": content_count,
        "portfolio": portfolio_count,
        "portfolio_invested": total_invested,
        "portfolio_current": total_current,
        "portfolio_gain": total_current - total_invested,
        "inventory_value": inventory_value,
        "wishlist_total": wishlist_total
    }

@api_router.get("/dashboard/recent")
async def get_recent_items(user: dict = Depends(get_current_user), limit: int = 10):
    user_id = user["id"]
    
    # Get recent items from each collection
    recent_inventory = await db.inventory.find(
        {"user_id": user_id}, {"_id": 0}
    ).sort("updated_at", -1).limit(limit).to_list(limit)
    
    recent_wishlist = await db.wishlist.find(
        {"user_id": user_id}, {"_id": 0}
    ).sort("updated_at", -1).limit(limit).to_list(limit)
    
    recent_tasks = await db.tasks.find(
        {"user_id": user_id, "completed": False}, {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    recent_content = await db.content.find(
        {"user_id": user_id}, {"_id": 0}
    ).sort("updated_at", -1).limit(limit).to_list(limit)
    
    return {
        "inventory": recent_inventory,
        "wishlist": recent_wishlist,
        "tasks": recent_tasks,
        "content": recent_content
    }

@api_router.get("/tags")
async def get_all_tags(user: dict = Depends(get_current_user)):
    user_id = user["id"]
    
    # Aggregate tags from all collections
    tags = set()
    
    for collection in [db.inventory, db.wishlist, db.content, db.portfolio, db.tasks, db.projects]:
        items = await collection.find({"user_id": user_id}, {"tags": 1, "_id": 0}).to_list(1000)
        for item in items:
            tags.update(item.get("tags", []))
    
    return sorted(list(tags))

# ==================== SEARCH ROUTES ====================

@api_router.get("/search")
async def global_search(
    q: str = Query(..., min_length=1),
    user: dict = Depends(get_current_user)
):
    user_id = user["id"]
    search_query = {"$regex": q, "$options": "i"}
    
    results = {
        "collections": [],
        "inventory": [],
        "wishlist": [],
        "projects": [],
        "tasks": [],
        "content": [],
        "portfolio": []
    }
    
    # Search collections
    collections = await db.collections.find(
        {"user_id": user_id, "$or": [{"name": search_query}, {"description": search_query}]},
        {"_id": 0}
    ).limit(10).to_list(10)
    results["collections"] = collections
    
    # Search inventory
    inventory = await db.inventory.find(
        {"user_id": user_id, "$or": [{"name": search_query}, {"description": search_query}]},
        {"_id": 0}
    ).limit(10).to_list(10)
    results["inventory"] = inventory
    
    # Search wishlist
    wishlist = await db.wishlist.find(
        {"user_id": user_id, "$or": [{"name": search_query}, {"description": search_query}]},
        {"_id": 0}
    ).limit(10).to_list(10)
    results["wishlist"] = wishlist
    
    # Search projects
    projects = await db.projects.find(
        {"user_id": user_id, "$or": [{"name": search_query}, {"description": search_query}]},
        {"_id": 0}
    ).limit(10).to_list(10)
    results["projects"] = projects
    
    # Search tasks
    tasks = await db.tasks.find(
        {"user_id": user_id, "$or": [{"title": search_query}, {"description": search_query}]},
        {"_id": 0}
    ).limit(10).to_list(10)
    results["tasks"] = tasks
    
    # Search content
    content = await db.content.find(
        {"user_id": user_id, "$or": [{"title": search_query}, {"description": search_query}, {"body": search_query}]},
        {"_id": 0}
    ).limit(10).to_list(10)
    results["content"] = content
    
    # Search portfolio
    portfolio = await db.portfolio.find(
        {"user_id": user_id, "$or": [{"name": search_query}, {"symbol": search_query}, {"notes": search_query}]},
        {"_id": 0}
    ).limit(10).to_list(10)
    results["portfolio"] = portfolio
    
    return results

# ==================== COINGECKO CRYPTO PRICES ====================

COINGECKO_BASE_URL = "https://api.coingecko.com/api/v3"

# Common crypto symbols mapping to CoinGecko IDs
CRYPTO_SYMBOL_MAP = {
    "BTC": "bitcoin",
    "ETH": "ethereum",
    "BNB": "binancecoin",
    "XRP": "ripple",
    "ADA": "cardano",
    "DOGE": "dogecoin",
    "SOL": "solana",
    "DOT": "polkadot",
    "MATIC": "matic-network",
    "LTC": "litecoin",
    "AVAX": "avalanche-2",
    "LINK": "chainlink",
    "UNI": "uniswap",
    "ATOM": "cosmos",
    "XLM": "stellar",
}

@api_router.get("/crypto/prices")
async def get_crypto_prices(symbols: str = Query(..., description="Comma-separated symbols like BTC,ETH")):
    """Get current prices for cryptocurrencies from CoinGecko (free tier)"""
    symbol_list = [s.strip().upper() for s in symbols.split(",")]
    
    # Convert symbols to CoinGecko IDs
    coin_ids = []
    symbol_to_id = {}
    for symbol in symbol_list:
        coin_id = CRYPTO_SYMBOL_MAP.get(symbol, symbol.lower())
        coin_ids.append(coin_id)
        symbol_to_id[coin_id] = symbol
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{COINGECKO_BASE_URL}/simple/price",
                params={
                    "ids": ",".join(coin_ids),
                    "vs_currencies": "eur,usd",
                    "include_24hr_change": "true",
                    "include_market_cap": "true"
                },
                timeout=10.0
            )
            response.raise_for_status()
            data = response.json()
            
            # Format response with original symbols
            result = {}
            for coin_id, prices in data.items():
                symbol = symbol_to_id.get(coin_id, coin_id.upper())
                result[symbol] = {
                    "price_eur": prices.get("eur"),
                    "price_usd": prices.get("usd"),
                    "change_24h": prices.get("eur_24h_change"),
                    "market_cap_eur": prices.get("eur_market_cap")
                }
            
            return result
    except httpx.HTTPError as e:
        logger.error(f"CoinGecko API error: {e}")
        raise HTTPException(status_code=503, detail="Service de prix temporairement indisponible")

@api_router.get("/crypto/search")
async def search_crypto(query: str = Query(..., min_length=1)):
    """Search for cryptocurrencies on CoinGecko"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{COINGECKO_BASE_URL}/search",
                params={"query": query},
                timeout=10.0
            )
            response.raise_for_status()
            data = response.json()
            
            # Return top 10 coins
            coins = data.get("coins", [])[:10]
            return [
                {
                    "id": c["id"],
                    "symbol": c["symbol"].upper(),
                    "name": c["name"],
                    "market_cap_rank": c.get("market_cap_rank")
                }
                for c in coins
            ]
    except httpx.HTTPError as e:
        logger.error(f"CoinGecko search error: {e}")
        raise HTTPException(status_code=503, detail="Recherche temporairement indisponible")

@api_router.post("/portfolio/refresh-prices")
async def refresh_portfolio_prices(user: dict = Depends(get_current_user)):
    """Refresh all crypto prices in the portfolio"""
    user_id = user["id"]
    
    # Get all crypto assets
    crypto_assets = await db.portfolio.find(
        {"user_id": user_id, "asset_type": "crypto", "symbol": {"$ne": None}},
        {"_id": 0}
    ).to_list(100)
    
    if not crypto_assets:
        return {"updated": 0, "message": "Aucun actif crypto avec symbole trouvé"}
    
    # Get unique symbols
    symbols = list(set(a["symbol"] for a in crypto_assets if a.get("symbol")))
    
    if not symbols:
        return {"updated": 0}
    
    # Fetch prices
    try:
        coin_ids = [CRYPTO_SYMBOL_MAP.get(s, s.lower()) for s in symbols]
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{COINGECKO_BASE_URL}/simple/price",
                params={
                    "ids": ",".join(coin_ids),
                    "vs_currencies": "eur"
                },
                timeout=10.0
            )
            response.raise_for_status()
            prices = response.json()
        
        # Update assets
        updated_count = 0
        now = datetime.now(timezone.utc).isoformat()
        
        for asset in crypto_assets:
            symbol = asset.get("symbol")
            coin_id = CRYPTO_SYMBOL_MAP.get(symbol, symbol.lower())
            
            if coin_id in prices and "eur" in prices[coin_id]:
                new_price = prices[coin_id]["eur"]
                await db.portfolio.update_one(
                    {"id": asset["id"]},
                    {"$set": {"current_price": new_price, "updated_at": now}}
                )
                updated_count += 1
        
        return {"updated": updated_count, "message": f"{updated_count} prix mis à jour"}
    
    except httpx.HTTPError as e:
        logger.error(f"Price refresh error: {e}")
        raise HTTPException(status_code=503, detail="Impossible de récupérer les prix")

# ==================== PRICE ALERTS ====================

class PriceAlertCreate(BaseModel):
    item_type: str  # portfolio, wishlist, inventory
    item_id: str
    alert_type: str  # target_price, price_change_up, price_change_down
    target_value: float  # Target price or percentage
    is_percentage: bool = False
    notify_email: bool = False

class PriceAlertResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    user_id: str
    item_type: str
    item_id: str
    item_name: str
    alert_type: str
    target_value: float
    is_percentage: bool
    current_value: Optional[float] = None
    triggered: bool = False
    triggered_at: Optional[str] = None
    created_at: str

@api_router.post("/alerts", response_model=PriceAlertResponse)
async def create_price_alert(data: PriceAlertCreate, user: dict = Depends(get_current_user)):
    """Create a price alert for an item"""
    user_id = user["id"]
    
    # Get item details
    collection_map = {
        "portfolio": db.portfolio,
        "wishlist": db.wishlist,
        "inventory": db.inventory
    }
    
    if data.item_type not in collection_map:
        raise HTTPException(status_code=400, detail="Type d'item invalide")
    
    collection = collection_map[data.item_type]
    item = await collection.find_one({"id": data.item_id, "user_id": user_id}, {"_id": 0})
    
    if not item:
        raise HTTPException(status_code=404, detail="Item non trouvé")
    
    # Get item name and current value
    item_name = item.get("name") or item.get("title", "Sans nom")
    
    if data.item_type == "portfolio":
        current_value = item.get("current_price") or item.get("purchase_price")
    elif data.item_type == "wishlist":
        current_value = item.get("price")
    else:  # inventory
        current_value = item.get("current_value") or item.get("purchase_price")
    
    alert_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    alert_doc = {
        "id": alert_id,
        "user_id": user_id,
        "item_type": data.item_type,
        "item_id": data.item_id,
        "item_name": item_name,
        "alert_type": data.alert_type,
        "target_value": data.target_value,
        "is_percentage": data.is_percentage,
        "current_value": current_value,
        "triggered": False,
        "triggered_at": None,
        "created_at": now
    }
    
    await db.alerts.insert_one(alert_doc)
    alert_doc.pop("_id", None)
    
    return PriceAlertResponse(**alert_doc)

@api_router.get("/alerts", response_model=List[PriceAlertResponse])
async def get_alerts(user: dict = Depends(get_current_user), triggered: Optional[bool] = None):
    """Get all price alerts for the user"""
    query = {"user_id": user["id"]}
    if triggered is not None:
        query["triggered"] = triggered
    
    alerts = await db.alerts.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return [PriceAlertResponse(**a) for a in alerts]

@api_router.delete("/alerts/{alert_id}")
async def delete_alert(alert_id: str, user: dict = Depends(get_current_user)):
    """Delete a price alert"""
    result = await db.alerts.delete_one({"id": alert_id, "user_id": user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Alerte non trouvée")
    return {"message": "Alerte supprimée"}

@api_router.post("/alerts/check")
async def check_alerts(user: dict = Depends(get_current_user)):
    """Check all alerts and mark triggered ones"""
    user_id = user["id"]
    
    # Get non-triggered alerts
    alerts = await db.alerts.find(
        {"user_id": user_id, "triggered": False},
        {"_id": 0}
    ).to_list(100)
    
    triggered_alerts = []
    now = datetime.now(timezone.utc).isoformat()
    
    collection_map = {
        "portfolio": db.portfolio,
        "wishlist": db.wishlist,
        "inventory": db.inventory
    }
    
    for alert in alerts:
        collection = collection_map.get(alert["item_type"])
        if collection is None:
            continue
        
        item = await collection.find_one({"id": alert["item_id"]}, {"_id": 0})
        if not item:
            continue
        
        # Get current value
        if alert["item_type"] == "portfolio":
            current = item.get("current_price") or item.get("purchase_price", 0)
            base = item.get("purchase_price", 0)
        elif alert["item_type"] == "wishlist":
            current = item.get("price", 0)
            base = alert.get("current_value", current)
        else:
            current = item.get("current_value") or item.get("purchase_price", 0)
            base = item.get("purchase_price", 0)
        
        if not current:
            continue
        
        triggered = False
        
        if alert["alert_type"] == "target_price":
            # Target price reached
            triggered = current <= alert["target_value"]
        
        elif alert["alert_type"] == "price_change_up" and base > 0:
            if alert["is_percentage"]:
                change_pct = ((current - base) / base) * 100
                triggered = change_pct >= alert["target_value"]
            else:
                triggered = current >= (base + alert["target_value"])
        
        elif alert["alert_type"] == "price_change_down" and base > 0:
            if alert["is_percentage"]:
                change_pct = ((base - current) / base) * 100
                triggered = change_pct >= alert["target_value"]
            else:
                triggered = current <= (base - alert["target_value"])
        
        if triggered:
            await db.alerts.update_one(
                {"id": alert["id"]},
                {"$set": {"triggered": True, "triggered_at": now, "current_value": current}}
            )
            triggered_alerts.append({
                "id": alert["id"],
                "item_name": alert["item_name"],
                "alert_type": alert["alert_type"],
                "target_value": alert["target_value"],
                "current_value": current
            })
    
    return {
        "checked": len(alerts),
        "triggered": len(triggered_alerts),
        "alerts": triggered_alerts
    }

# ==================== ITEM LINKS ====================

class LinkItemsRequest(BaseModel):
    source_type: str
    source_id: str
    target_type: str
    target_id: str
    label: Optional[str] = None

@api_router.post("/links")
async def link_items(data: LinkItemsRequest, user: dict = Depends(get_current_user)):
    """Create a bidirectional link between two items"""
    user_id = user["id"]
    
    collection_map = {
        "collection": db.collections,
        "inventory": db.inventory,
        "wishlist": db.wishlist,
        "project": db.projects,
        "task": db.tasks,
        "content": db.content,
        "portfolio": db.portfolio
    }
    
    if data.source_type not in collection_map or data.target_type not in collection_map:
        raise HTTPException(status_code=400, detail="Type d'item invalide")
    
    # Verify both items exist
    source_col = collection_map[data.source_type]
    target_col = collection_map[data.target_type]
    
    source_item = await source_col.find_one({"id": data.source_id, "user_id": user_id})
    target_item = await target_col.find_one({"id": data.target_id, "user_id": user_id})
    
    if not source_item or not target_item:
        raise HTTPException(status_code=404, detail="Item source ou cible non trouvé")
    
    # Get names for display
    source_name = source_item.get("name") or source_item.get("title", "Sans nom")
    target_name = target_item.get("name") or target_item.get("title", "Sans nom")
    
    now = datetime.now(timezone.utc).isoformat()
    
    # Add link to source -> target
    source_link = {
        "item_id": data.target_id,
        "item_type": data.target_type,
        "item_name": target_name,
        "label": data.label,
        "created_at": now
    }
    
    # Add link to target -> source (bidirectional)
    target_link = {
        "item_id": data.source_id,
        "item_type": data.source_type,
        "item_name": source_name,
        "label": data.label,
        "created_at": now
    }
    
    # Update both items
    await source_col.update_one(
        {"id": data.source_id},
        {"$push": {"links": source_link}, "$set": {"updated_at": now}}
    )
    
    await target_col.update_one(
        {"id": data.target_id},
        {"$push": {"links": target_link}, "$set": {"updated_at": now}}
    )
    
    return {
        "message": "Lien créé",
        "source": {"id": data.source_id, "name": source_name},
        "target": {"id": data.target_id, "name": target_name}
    }

@api_router.delete("/links")
async def unlink_items(
    source_type: str,
    source_id: str,
    target_type: str,
    target_id: str,
    user: dict = Depends(get_current_user)
):
    """Remove a link between two items"""
    user_id = user["id"]
    
    collection_map = {
        "collection": db.collections,
        "inventory": db.inventory,
        "wishlist": db.wishlist,
        "project": db.projects,
        "task": db.tasks,
        "content": db.content,
        "portfolio": db.portfolio
    }
    
    source_col = collection_map.get(source_type)
    target_col = collection_map.get(target_type)
    
    if source_col is None or target_col is None:
        raise HTTPException(status_code=400, detail="Type d'item invalide")
    
    now = datetime.now(timezone.utc).isoformat()
    
    # Remove link from both items
    await source_col.update_one(
        {"id": source_id, "user_id": user_id},
        {"$pull": {"links": {"item_id": target_id}}, "$set": {"updated_at": now}}
    )
    
    await target_col.update_one(
        {"id": target_id, "user_id": user_id},
        {"$pull": {"links": {"item_id": source_id}}, "$set": {"updated_at": now}}
    )
    
    return {"message": "Lien supprimé"}

@api_router.get("/links/{item_type}/{item_id}")
async def get_item_links(item_type: str, item_id: str, user: dict = Depends(get_current_user)):
    """Get all links for an item with full details"""
    user_id = user["id"]
    
    collection_map = {
        "collection": db.collections,
        "inventory": db.inventory,
        "wishlist": db.wishlist,
        "project": db.projects,
        "task": db.tasks,
        "content": db.content,
        "portfolio": db.portfolio
    }
    
    if item_type not in collection_map:
        raise HTTPException(status_code=400, detail="Type d'item invalide")
    
    collection = collection_map[item_type]
    item = await collection.find_one({"id": item_id, "user_id": user_id}, {"_id": 0})
    
    if not item:
        raise HTTPException(status_code=404, detail="Item non trouvé")
    
    links = item.get("links", [])
    
    # Enrich links with current item details
    enriched_links = []
    for link in links:
        linked_col = collection_map.get(link.get("item_type"))
        if linked_col is not None:
            linked_item = await linked_col.find_one(
                {"id": link["item_id"], "user_id": user_id},
                {"_id": 0, "name": 1, "title": 1, "description": 1, "id": 1}
            )
            if linked_item:
                enriched_links.append({
                    **link,
                    "item_name": linked_item.get("name") or linked_item.get("title", "Sans nom"),
                    "item_description": linked_item.get("description", "")
                })
    
    return enriched_links

# ==================== CUSTOM TYPES ====================

class CustomTypeCreate(BaseModel):
    name: str
    category: str  # collection, content
    fields: List[Dict[str, Any]] = []  # [{name, type, required, options}]
    color: Optional[str] = None
    icon: Optional[str] = None

class CustomTypeUpdate(BaseModel):
    name: Optional[str] = None
    fields: Optional[List[Dict[str, Any]]] = None
    color: Optional[str] = None
    icon: Optional[str] = None

class CustomTypeResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    user_id: str
    name: str
    category: str
    fields: List[Dict[str, Any]] = []
    color: Optional[str] = None
    icon: Optional[str] = None
    created_at: str

@api_router.post("/custom-types", response_model=CustomTypeResponse)
async def create_custom_type(data: CustomTypeCreate, user: dict = Depends(get_current_user)):
    type_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    doc = {
        "id": type_id,
        "user_id": user["id"],
        **data.model_dump(),
        "created_at": now
    }
    await db.custom_types.insert_one(doc)
    doc.pop("_id", None)
    return CustomTypeResponse(**doc)

@api_router.get("/custom-types", response_model=List[CustomTypeResponse])
async def get_custom_types(user: dict = Depends(get_current_user), category: Optional[str] = None):
    query = {"user_id": user["id"]}
    if category:
        query["category"] = category
    types = await db.custom_types.find(query, {"_id": 0}).to_list(100)
    return [CustomTypeResponse(**t) for t in types]

@api_router.put("/custom-types/{type_id}", response_model=CustomTypeResponse)
async def update_custom_type(type_id: str, data: CustomTypeUpdate, user: dict = Depends(get_current_user)):
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    result = await db.custom_types.find_one_and_update(
        {"id": type_id, "user_id": user["id"]},
        {"$set": update_data},
        return_document=True
    )
    if not result:
        raise HTTPException(status_code=404, detail="Type personnalisé non trouvé")
    result.pop("_id", None)
    return CustomTypeResponse(**result)

@api_router.delete("/custom-types/{type_id}")
async def delete_custom_type(type_id: str, user: dict = Depends(get_current_user)):
    result = await db.custom_types.delete_one({"id": type_id, "user_id": user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Type personnalisé non trouvé")
    return {"message": "Type supprimé"}

# ==================== TAGS MANAGEMENT ====================

class TagManageCreate(BaseModel):
    name: str
    color: Optional[str] = None
    category: Optional[str] = None

class TagManageResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    user_id: str
    name: str
    color: Optional[str] = None
    category: Optional[str] = None
    usage_count: int = 0
    created_at: str

@api_router.post("/tags/manage", response_model=TagManageResponse)
async def create_managed_tag(data: TagManageCreate, user: dict = Depends(get_current_user)):
    existing = await db.managed_tags.find_one({"user_id": user["id"], "name": data.name})
    if existing:
        raise HTTPException(status_code=400, detail="Ce tag existe déjà")
    tag_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    doc = {
        "id": tag_id,
        "user_id": user["id"],
        "name": data.name,
        "color": data.color,
        "category": data.category,
        "usage_count": 0,
        "created_at": now
    }
    await db.managed_tags.insert_one(doc)
    doc.pop("_id", None)
    return TagManageResponse(**doc)

@api_router.get("/tags/manage", response_model=List[TagManageResponse])
async def get_managed_tags(user: dict = Depends(get_current_user)):
    tags = await db.managed_tags.find({"user_id": user["id"]}, {"_id": 0}).sort("name", 1).to_list(500)
    # Calculate usage counts
    user_id = user["id"]
    for tag in tags:
        count = 0
        for col in [db.inventory, db.wishlist, db.content, db.portfolio, db.tasks, db.projects]:
            count += await col.count_documents({"user_id": user_id, "tags": tag["name"]})
        tag["usage_count"] = count
    return [TagManageResponse(**t) for t in tags]

@api_router.put("/tags/manage/{tag_id}", response_model=TagManageResponse)
async def update_managed_tag(tag_id: str, data: TagManageCreate, user: dict = Depends(get_current_user)):
    old_tag = await db.managed_tags.find_one({"id": tag_id, "user_id": user["id"]})
    if not old_tag:
        raise HTTPException(status_code=404, detail="Tag non trouvé")
    old_name = old_tag["name"]
    new_name = data.name
    update_data = {"name": data.name, "color": data.color, "category": data.category}
    result = await db.managed_tags.find_one_and_update(
        {"id": tag_id, "user_id": user["id"]},
        {"$set": update_data},
        return_document=True
    )
    # Rename tag in all items if name changed
    if old_name != new_name:
        user_id = user["id"]
        for col in [db.inventory, db.wishlist, db.content, db.portfolio, db.tasks, db.projects]:
            await col.update_many(
                {"user_id": user_id, "tags": old_name},
                {"$set": {"tags.$[elem]": new_name}},
                array_filters=[{"elem": old_name}]
            )
    result.pop("_id", None)
    result["usage_count"] = 0
    return TagManageResponse(**result)

@api_router.delete("/tags/manage/{tag_id}")
async def delete_managed_tag(tag_id: str, user: dict = Depends(get_current_user)):
    tag = await db.managed_tags.find_one({"id": tag_id, "user_id": user["id"]})
    if not tag:
        raise HTTPException(status_code=404, detail="Tag non trouvé")
    tag_name = tag["name"]
    await db.managed_tags.delete_one({"id": tag_id})
    # Remove tag from all items
    user_id = user["id"]
    for col in [db.inventory, db.wishlist, db.content, db.portfolio, db.tasks, db.projects]:
        await col.update_many(
            {"user_id": user_id, "tags": tag_name},
            {"$pull": {"tags": tag_name}}
        )
    return {"message": "Tag supprimé"}

# ==================== MINDMAP DATA ====================

@api_router.get("/mindmap")
async def get_mindmap_data(user: dict = Depends(get_current_user), perspective: Optional[str] = None):
    """Get all items with their links for mindmap visualization"""
    user_id = user["id"]
    nodes = []
    edges = []
    
    # Fetch all item types
    collections_list = await db.collections.find({"user_id": user_id}, {"_id": 0}).to_list(1000)
    inventory_list = await db.inventory.find({"user_id": user_id}, {"_id": 0}).to_list(1000)
    wishlist_list = await db.wishlist.find({"user_id": user_id}, {"_id": 0}).to_list(1000)
    projects_list = await db.projects.find({"user_id": user_id}, {"_id": 0}).to_list(1000)
    tasks_list = await db.tasks.find({"user_id": user_id}, {"_id": 0}).to_list(1000)
    content_list = await db.content.find({"user_id": user_id}, {"_id": 0}).to_list(1000)
    portfolio_list = await db.portfolio.find({"user_id": user_id}, {"_id": 0}).to_list(1000)
    
    type_config = {
        "collection": {"color": "#3b82f6", "items": collections_list},
        "inventory": {"color": "#8b5cf6", "items": inventory_list},
        "wishlist": {"color": "#ec4899", "items": wishlist_list},
        "project": {"color": "#f59e0b", "items": projects_list},
        "task": {"color": "#10b981", "items": tasks_list},
        "content": {"color": "#06b6d4", "items": content_list},
        "portfolio": {"color": "#f97316", "items": portfolio_list},
    }
    
    seen_edges = set()
    
    for item_type, config in type_config.items():
        for item in config["items"]:
            name = item.get("name") or item.get("title", "Sans nom")
            tags = item.get("tags", [])
            
            nodes.append({
                "id": item["id"],
                "type": item_type,
                "name": name,
                "color": config["color"],
                "tags": tags,
            })
            
            # Add link edges
            for link in item.get("links", []):
                target_id = link.get("item_id")
                if target_id:
                    edge_key = tuple(sorted([item["id"], target_id]))
                    if edge_key not in seen_edges:
                        seen_edges.add(edge_key)
                        edges.append({
                            "source": item["id"],
                            "target": target_id,
                            "label": link.get("label", ""),
                        })
            
            # Add collection membership edges
            if item_type == "inventory" and item.get("collection_id"):
                edge_key = tuple(sorted([item["id"], item["collection_id"]]))
                if edge_key not in seen_edges:
                    seen_edges.add(edge_key)
                    edges.append({
                        "source": item["id"],
                        "target": item["collection_id"],
                        "label": "dans",
                    })
            
            # Add project-task edges
            if item_type == "task" and item.get("project_id"):
                edge_key = tuple(sorted([item["id"], item["project_id"]]))
                if edge_key not in seen_edges:
                    seen_edges.add(edge_key)
                    edges.append({
                        "source": item["project_id"],
                        "target": item["id"],
                        "label": "tâche",
                    })
            
            # Add sub-project edges
            if item_type == "project" and item.get("parent_id"):
                edge_key = tuple(sorted([item["id"], item["parent_id"]]))
                if edge_key not in seen_edges:
                    seen_edges.add(edge_key)
                    edges.append({
                        "source": item["parent_id"],
                        "target": item["id"],
                        "label": "sous-projet",
                    })
    
    # Filter by perspective (tag or type)
    if perspective and perspective.startswith("tag:"):
        tag_name = perspective[4:]
        node_ids = {n["id"] for n in nodes if tag_name in n.get("tags", [])}
        nodes = [n for n in nodes if n["id"] in node_ids]
        edges = [e for e in edges if e["source"] in node_ids and e["target"] in node_ids]
    elif perspective and perspective.startswith("type:"):
        type_name = perspective[5:]
        node_ids = {n["id"] for n in nodes if n["type"] == type_name}
        nodes = [n for n in nodes if n["id"] in node_ids]
        edges = [e for e in edges if e["source"] in node_ids and e["target"] in node_ids]
    
    return {"nodes": nodes, "edges": edges}

# ==================== STORAGE USAGE ====================

@api_router.get("/storage/usage")
async def get_storage_usage(user: dict = Depends(get_current_user)):
    total_size = 0
    file_count = 0
    user_id = user["id"]
    for col_name in ["inventory", "wishlist", "content", "portfolio", "projects", "tasks"]:
        col = getattr(db, col_name)
        items_with_files = await col.find(
            {"user_id": user_id, "files": {"$exists": True, "$ne": []}},
            {"_id": 0, "files": 1}
        ).to_list(10000)
        for item in items_with_files:
            for f in item.get("files", []):
                file_count += 1
                filepath = f.get("path", "")
                if filepath:
                    full_path = ROOT_DIR / filepath.lstrip("/")
                    if full_path.exists():
                        total_size += full_path.stat().st_size
    disk_total = 0
    disk_count = 0
    if UPLOAD_DIR.exists():
        for f in UPLOAD_DIR.rglob("*"):
            if f.is_file():
                disk_total += f.stat().st_size
                disk_count += 1
    return {
        "user_file_count": file_count,
        "user_size_bytes": total_size,
        "user_size_mb": round(total_size / (1024 * 1024), 2),
        "total_disk_bytes": disk_total,
        "total_disk_mb": round(disk_total / (1024 * 1024), 2),
        "total_disk_files": disk_count
    }

# Include the router in the main app (again for new routes)
app.include_router(api_router)

# Serve uploaded files
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
