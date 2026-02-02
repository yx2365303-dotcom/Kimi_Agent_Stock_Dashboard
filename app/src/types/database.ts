// Supabase 数据库类型定义
// 基于实际数据库表结构定义

export interface Database {
  public: {
    Tables: {
      // =============================================
      // 股票基础数据表
      // =============================================
      
      // 股票基础信息表
      stock_basic: {
        Row: {
          ts_code: string;
          symbol: string;
          name: string;
          area: string | null;
          industry: string | null;
          cnspell: string | null;
          market: string | null;
          list_date: string | null;
          act_name: string | null;
          act_ent_type: string | null;
        };
        Insert: {
          ts_code: string;
          symbol: string;
          name: string;
          area?: string | null;
          industry?: string | null;
          cnspell?: string | null;
          market?: string | null;
          list_date?: string | null;
          act_name?: string | null;
          act_ent_type?: string | null;
        };
        Update: {
          ts_code?: string;
          symbol?: string;
          name?: string;
          area?: string | null;
          industry?: string | null;
          cnspell?: string | null;
          market?: string | null;
          list_date?: string | null;
          act_name?: string | null;
          act_ent_type?: string | null;
        };
      };

      // 每日基本指标表（估值数据）
      daily_basic: {
        Row: {
          ts_code: string;
          trade_date: string;
          close: number;
          turnover_rate: number | null;
          turnover_rate_f: number | null;
          volume_ratio: number | null;
          pe: number | null;
          pe_ttm: number | null;
          pb: number | null;
          ps: number | null;
          ps_ttm: number | null;
          dv_ratio: number | null;
          dv_ttm: number | null;
          total_share: number | null;
          float_share: number | null;
          free_share: number | null;
          total_mv: number | null;
          circ_mv: number | null;
        };
        Insert: {
          ts_code: string;
          trade_date: string;
          close: number;
          turnover_rate?: number | null;
          turnover_rate_f?: number | null;
          volume_ratio?: number | null;
          pe?: number | null;
          pe_ttm?: number | null;
          pb?: number | null;
          ps?: number | null;
          ps_ttm?: number | null;
          dv_ratio?: number | null;
          dv_ttm?: number | null;
          total_share?: number | null;
          float_share?: number | null;
          free_share?: number | null;
          total_mv?: number | null;
          circ_mv?: number | null;
        };
        Update: Partial<Database['public']['Tables']['daily_basic']['Insert']>;
      };

      // =============================================
      // 指数数据表
      // =============================================

      // 指数基础信息表
      index_basic: {
        Row: {
          ts_code: string;
          name: string;
          fullname: string | null;
          market: string | null;
          publisher: string | null;
          index_type: string | null;
          category: string | null;
          base_date: string | null;
          base_point: number | null;
          list_date: string | null;
          weight_rule: string | null;
          desc: string | null;
          exp_date: string | null;
        };
        Insert: {
          ts_code: string;
          name: string;
          fullname?: string | null;
          market?: string | null;
          publisher?: string | null;
          index_type?: string | null;
          category?: string | null;
          base_date?: string | null;
          base_point?: number | null;
          list_date?: string | null;
          weight_rule?: string | null;
          desc?: string | null;
          exp_date?: string | null;
        };
        Update: Partial<Database['public']['Tables']['index_basic']['Insert']>;
      };

      // 指数日线行情表
      index_daily: {
        Row: {
          ts_code: string;
          trade_date: string;
          close: number;
          open: number;
          high: number;
          low: number;
          pre_close: number;
          change: number;
          pct_chg: number;
          vol: number;
          amount: number;
        };
        Insert: {
          ts_code: string;
          trade_date: string;
          close: number;
          open: number;
          high: number;
          low: number;
          pre_close: number;
          change: number;
          pct_chg: number;
          vol: number;
          amount: number;
        };
        Update: Partial<Database['public']['Tables']['index_daily']['Insert']>;
      };

      // =============================================
      // 同花顺板块数据表
      // =============================================

      // 同花顺板块基础信息表
      ths_index: {
        Row: {
          ts_code: string;
          name: string;
          count: number | null;
          exchange: string | null;
          list_date: string | null;
          type: string | null; // N-概念板块, I-行业板块
        };
        Insert: {
          ts_code: string;
          name: string;
          count?: number | null;
          exchange?: string | null;
          list_date?: string | null;
          type?: string | null;
        };
        Update: Partial<Database['public']['Tables']['ths_index']['Insert']>;
      };

      // 同花顺板块日线行情表
      ths_daily: {
        Row: {
          ts_code: string;
          trade_date: string;
          close: number;
          open: number | null;
          high: number | null;
          low: number | null;
          pre_close: number | null;
          avg_price: number | null;
          change: number | null;
          pct_change: number | null;
          vol: number | null;
          turnover_rate: number | null;
          total_mv: number | null;
          float_mv: number | null;
        };
        Insert: {
          ts_code: string;
          trade_date: string;
          close: number;
          open?: number | null;
          high?: number | null;
          low?: number | null;
          pre_close?: number | null;
          avg_price?: number | null;
          change?: number | null;
          pct_change?: number | null;
          vol?: number | null;
          turnover_rate?: number | null;
          total_mv?: number | null;
          float_mv?: number | null;
        };
        Update: Partial<Database['public']['Tables']['ths_daily']['Insert']>;
      };

      // 同花顺板块成分股表
      ths_member: {
        Row: {
          ts_code: string;
          con_code: string;
          con_name: string | null;
        };
        Insert: {
          ts_code: string;
          con_code: string;
          con_name?: string | null;
        };
        Update: Partial<Database['public']['Tables']['ths_member']['Insert']>;
      };

      // =============================================
      // 涨跌停数据表
      // =============================================

      // 涨跌停列表（每日详细）
      limit_list_d: {
        Row: {
          trade_date: string;
          ts_code: string;
          industry: string | null;
          name: string;
          close: number;
          pct_chg: number;
          amount: number | null;
          limit_amount: number | null;
          float_mv: number | null;
          total_mv: number | null;
          turnover_ratio: number | null;
          fd_amount: number | null;
          first_time: string | null;
          last_time: string | null;
          open_times: number | null;
          up_stat: string | null;
          limit_times: number | null;
          limit: string; // 'U'-涨停, 'D'-跌停
        };
        Insert: {
          trade_date: string;
          ts_code: string;
          industry?: string | null;
          name: string;
          close: number;
          pct_chg: number;
          amount?: number | null;
          limit_amount?: number | null;
          float_mv?: number | null;
          total_mv?: number | null;
          turnover_ratio?: number | null;
          fd_amount?: number | null;
          first_time?: string | null;
          last_time?: string | null;
          open_times?: number | null;
          up_stat?: string | null;
          limit_times?: number | null;
          limit: string;
        };
        Update: Partial<Database['public']['Tables']['limit_list_d']['Insert']>;
      };

      // 涨跌停价格表
      stk_limit: {
        Row: {
          trade_date: string;
          ts_code: string;
          up_limit: number;
          down_limit: number;
        };
        Insert: {
          trade_date: string;
          ts_code: string;
          up_limit: number;
          down_limit: number;
        };
        Update: Partial<Database['public']['Tables']['stk_limit']['Insert']>;
      };

      // =============================================
      // 资金流向数据表
      // =============================================

      // 个股资金流向表
      moneyflow: {
        Row: {
          ts_code: string;
          trade_date: string;
          buy_sm_vol: number | null;
          buy_sm_amount: number | null;
          sell_sm_vol: number | null;
          sell_sm_amount: number | null;
          buy_md_vol: number | null;
          buy_md_amount: number | null;
          sell_md_vol: number | null;
          sell_md_amount: number | null;
          buy_lg_vol: number | null;
          buy_lg_amount: number | null;
          sell_lg_vol: number | null;
          sell_lg_amount: number | null;
          buy_elg_vol: number | null;
          buy_elg_amount: number | null;
          sell_elg_vol: number | null;
          sell_elg_amount: number | null;
          net_mf_vol: number | null;
          net_mf_amount: number | null;
        };
        Insert: {
          ts_code: string;
          trade_date: string;
          buy_sm_vol?: number | null;
          buy_sm_amount?: number | null;
          sell_sm_vol?: number | null;
          sell_sm_amount?: number | null;
          buy_md_vol?: number | null;
          buy_md_amount?: number | null;
          sell_md_vol?: number | null;
          sell_md_amount?: number | null;
          buy_lg_vol?: number | null;
          buy_lg_amount?: number | null;
          sell_lg_vol?: number | null;
          sell_lg_amount?: number | null;
          buy_elg_vol?: number | null;
          buy_elg_amount?: number | null;
          sell_elg_vol?: number | null;
          sell_elg_amount?: number | null;
          net_mf_vol?: number | null;
          net_mf_amount?: number | null;
        };
        Update: Partial<Database['public']['Tables']['moneyflow']['Insert']>;
      };

      // =============================================
      // 沪深股通数据表
      // =============================================

      // 沪深股通Top10持股
      hsgt_top10: {
        Row: {
          trade_date: string;
          ts_code: string;
          name: string;
          close: number;
          change: number;
          rank: number;
          market_type: number; // 1-沪股通, 3-深股通
          amount: number;
          net_amount: number | null;
          buy: number | null;
          sell: number | null;
        };
        Insert: {
          trade_date: string;
          ts_code: string;
          name: string;
          close: number;
          change: number;
          rank: number;
          market_type: number;
          amount: number;
          net_amount?: number | null;
          buy?: number | null;
          sell?: number | null;
        };
        Update: Partial<Database['public']['Tables']['hsgt_top10']['Insert']>;
      };

      // =============================================
      // 开盘啦数据表
      // =============================================

      // 开盘啦概念热度
      kpl_concept: {
        Row: {
          trade_date: string;
          ts_code: string;
          name: string;
          z_t_num: number | null; // 涨停数
          up_num: string | null; // 上涨数
        };
        Insert: {
          trade_date: string;
          ts_code: string;
          name: string;
          z_t_num?: number | null;
          up_num?: string | null;
        };
        Update: Partial<Database['public']['Tables']['kpl_concept']['Insert']>;
      };

      // 开盘啦涨停列表
      kpl_list: {
        Row: {
          ts_code: string;
          name: string;
          trade_date: string;
          lu_time: string | null; // 涨停时间
          ld_time: string | null; // 跌停时间
          open_time: string | null;
          last_time: string | null;
          lu_desc: string | null;
          tag: string | null;
          theme: string | null;
          net_change: number | null;
          bid_amount: number | null;
          status: string | null;
          bid_change: number | null;
          bid_turnover: number | null;
          lu_bid_vol: number | null;
          pct_chg: number | null;
          bid_pct_chg: number | null;
          rt_pct_chg: number | null;
          limit_order: number | null;
          amount: number | null;
          turnover_rate: number | null;
          free_float: number | null;
          lu_limit_order: number | null;
        };
        Insert: {
          ts_code: string;
          name: string;
          trade_date: string;
          lu_time?: string | null;
          ld_time?: string | null;
          open_time?: string | null;
          last_time?: string | null;
          lu_desc?: string | null;
          tag?: string | null;
          theme?: string | null;
          net_change?: number | null;
          bid_amount?: number | null;
          status?: string | null;
          bid_change?: number | null;
          bid_turnover?: number | null;
          lu_bid_vol?: number | null;
          pct_chg?: number | null;
          bid_pct_chg?: number | null;
          rt_pct_chg?: number | null;
          limit_order?: number | null;
          amount?: number | null;
          turnover_rate?: number | null;
          free_float?: number | null;
          lu_limit_order?: number | null;
        };
        Update: Partial<Database['public']['Tables']['kpl_list']['Insert']>;
      };

      // =============================================
      // 选股策略表（可能需要创建）
      // =============================================

      picker_strategy: {
        Row: {
          id: number;
          name: string;
          description: string | null;
          category: 'technical' | 'fundamental' | 'moneyflow' | 'pattern' | 'composite' | 'custom';
          stock_pool_config: Record<string, unknown>;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          name: string;
          description?: string | null;
          category?: 'technical' | 'fundamental' | 'moneyflow' | 'pattern' | 'composite' | 'custom';
          stock_pool_config?: Record<string, unknown>;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['picker_strategy']['Insert']>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
}

// 导出表行类型别名，方便使用
export type StockBasicRow = Database['public']['Tables']['stock_basic']['Row'];
export type DailyBasicRow = Database['public']['Tables']['daily_basic']['Row'];
export type IndexBasicRow = Database['public']['Tables']['index_basic']['Row'];
export type IndexDailyRow = Database['public']['Tables']['index_daily']['Row'];
export type ThsIndexRow = Database['public']['Tables']['ths_index']['Row'];
export type ThsDailyRow = Database['public']['Tables']['ths_daily']['Row'];
export type ThsMemberRow = Database['public']['Tables']['ths_member']['Row'];
export type LimitListDRow = Database['public']['Tables']['limit_list_d']['Row'];
export type StkLimitRow = Database['public']['Tables']['stk_limit']['Row'];
export type MoneyflowRow = Database['public']['Tables']['moneyflow']['Row'];
export type HsgtTop10Row = Database['public']['Tables']['hsgt_top10']['Row'];
export type KplConceptRow = Database['public']['Tables']['kpl_concept']['Row'];
export type KplListRow = Database['public']['Tables']['kpl_list']['Row'];
export type PickerStrategyRow = Database['public']['Tables']['picker_strategy']['Row'];
