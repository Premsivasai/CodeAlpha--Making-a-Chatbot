interface GraphNode {
  id: string;
  type: "product" | "brand" | "category" | "accessory" | "competitor" | "discussion" | "video";
  label: string;
  metadata?: Record<string, any>;
}

interface Edge {
  from: string;
  to: string;
  relation: string;
}

export class ProductKnowledgeGraph {
  private nodes = new Map<string, GraphNode>();
  private edges: Edge[] = [];

  constructor() {
    this.initializeMockGraph();
  }

  public addNode(node: GraphNode): void {
    this.nodes.set(node.id, node);
  }

  public addEdge(from: string, to: string, relation: string): void {
    this.edges.push({ from, to, relation });
  }

  /**
   * Traverse the graph to find recommended items related to a given product ID.
   * Traversal paths:
   * 1. Product -> Competitor
   * 2. Product -> Accessory
   * 3. Product -> Category -> other Products in same Category (excluding itself)
   * 4. Product -> Brand -> other Products under same Brand (excluding itself)
   */
  public traverseRecommendations(productId: string): {
    competitors: GraphNode[];
    accessories: GraphNode[];
    related: GraphNode[];
    discussions: GraphNode[];
  } {
    const competitors: GraphNode[] = [];
    const accessories: GraphNode[] = [];
    const related: GraphNode[] = [];
    const discussions: GraphNode[] = [];

    // Find direct connections
    const directEdges = this.edges.filter(e => e.from === productId || e.to === productId);

    for (const edge of directEdges) {
      const neighborId = edge.from === productId ? edge.to : edge.from;
      const neighborNode = this.nodes.get(neighborId);
      if (!neighborNode) continue;

      if (edge.relation === "COMPETES_WITH" || neighborNode.type === "competitor") {
        competitors.push(neighborNode);
      } else if (edge.relation === "HAS_ACCESSORY" || neighborNode.type === "accessory") {
        accessories.push(neighborNode);
      } else if (neighborNode.type === "discussion" || neighborNode.type === "video") {
        discussions.push(neighborNode);
      }
    }

    // Two-step traversal for Category & Brand peers
    const categoryEdges = this.edges.filter(e => (e.from === productId || e.to === productId) && e.relation === "BELONGS_TO_CATEGORY");
    for (const catEdge of categoryEdges) {
      const categoryId = catEdge.from === productId ? catEdge.to : catEdge.from;
      // Find other products belonging to this category
      const peerEdges = this.edges.filter(e => e.to === categoryId && e.relation === "BELONGS_TO_CATEGORY" && e.from !== productId);
      for (const pEdge of peerEdges) {
        const peerNode = this.nodes.get(pEdge.from);
        if (peerNode && !related.some(r => r.id === peerNode.id)) {
          related.push(peerNode);
        }
      }
    }

    const brandEdges = this.edges.filter(e => (e.from === productId || e.to === productId) && e.relation === "MANUFACTURED_BY");
    for (const brandEdge of brandEdges) {
      const brandId = brandEdge.from === productId ? brandEdge.to : brandEdge.from;
      // Find other products manufactured by this brand
      const peerEdges = this.edges.filter(e => e.to === brandId && e.relation === "MANUFACTURED_BY" && e.from !== productId);
      for (const pEdge of peerEdges) {
        const peerNode = this.nodes.get(pEdge.from);
        if (peerNode && !related.some(r => r.id === peerNode.id)) {
          related.push(peerNode);
        }
      }
    }

    return {
      competitors: competitors.slice(0, 3),
      accessories: accessories.slice(0, 3),
      related: related.slice(0, 3),
      discussions: discussions.slice(0, 3)
    };
  }

  private initializeMockGraph(): void {
    // Categories
    this.addNode({ id: "cat_mobile", type: "category", label: "Mobiles & Smartphones" });
    this.addNode({ id: "cat_laptop", type: "category", label: "Laptops & Notebooks" });

    // Brands
    this.addNode({ id: "brand_oneplus", type: "brand", label: "OnePlus" });
    this.addNode({ id: "brand_poco", type: "brand", label: "Poco / Xiaomi" });
    this.addNode({ id: "brand_realme", type: "brand", label: "Realme" });

    // Mobile nodes
    this.addNode({ id: "oneplus_12r", type: "product", label: "OnePlus 12R", metadata: { price: 39999 } });
    this.addNode({ id: "poco_x6", type: "product", label: "Poco X6 Pro", metadata: { price: 24999 } });
    this.addNode({ id: "narzo_70", type: "product", label: "Realme Narzo 70 Pro", metadata: { price: 19999 } });

    // Mobiles -> Category
    this.addEdge("oneplus_12r", "cat_mobile", "BELONGS_TO_CATEGORY");
    this.addEdge("poco_x6", "cat_mobile", "BELONGS_TO_CATEGORY");
    this.addEdge("narzo_70", "cat_mobile", "BELONGS_TO_CATEGORY");

    // Mobiles -> Brands
    this.addEdge("oneplus_12r", "brand_oneplus", "MANUFACTURED_BY");
    this.addEdge("poco_x6", "brand_poco", "MANUFACTURED_BY");
    this.addEdge("narzo_70", "brand_realme", "MANUFACTURED_BY");

    // Competitors
    this.addEdge("poco_x6", "narzo_70", "COMPETES_WITH");
    this.addEdge("poco_x6", "oneplus_12r", "COMPETES_WITH");

    // Accessories
    this.addNode({ id: "acc_case", type: "accessory", label: "Spigen Rugged Armor Case", metadata: { price: 999 } });
    this.addNode({ id: "acc_charger", type: "accessory", label: "GaN 65W Multi-Port Charger", metadata: { price: 1999 } });
    this.addEdge("poco_x6", "acc_case", "HAS_ACCESSORY");
    this.addEdge("poco_x6", "acc_charger", "HAS_ACCESSORY");
    this.addEdge("oneplus_12r", "acc_charger", "HAS_ACCESSORY");

    // Discussions & Reviews
    this.addNode({ id: "reddit_poco", type: "discussion", label: "r/PocoPhones - Poco X6 Pro long-term gaming review" });
    this.addNode({ id: "yt_review", type: "video", label: "YouTube - OnePlus 12R vs Poco X6 Pro camera test comparison" });
    this.addEdge("poco_x6", "reddit_poco", "DISCUSSED_IN");
    this.addEdge("poco_x6", "yt_review", "REVIEWED_IN");
    this.addEdge("oneplus_12r", "yt_review", "REVIEWED_IN");
  }
}

export const knowledgeGraph = new ProductKnowledgeGraph();
