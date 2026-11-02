import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import ClarificationCard from './ClarificationCard.vue'
const question = { mode: 'single' as const, question: '想查哪类销量？', options: [{value:'fruit',label:'水果'}, {value:'brand',label:'品牌'}], selected: [], text: '', submitted:false }
it('renders single options without a default or automatic submission', async()=>{
 const w=mount(ClarificationCard,{props:{question,id:'q'}})
 expect(w.findAll('input[type="radio"]')).toHaveLength(2)
 expect(w.get('button').attributes('disabled')).toBeDefined()
 await w.findAll('input')[0].setValue(true)
 expect(w.emitted('select')?.[0]).toEqual(['fruit']);expect(w.emitted('submit')).toBeUndefined()
 await w.setProps({question:{...question,text:'自定义回答'}})
 expect(w.get('button').attributes('disabled')).toBeUndefined()
 await w.get('form').trigger('submit');expect(w.emitted('submit')).toHaveLength(1)
})
it('renders multi options, independent text and a shared submit',()=>{
 const w=mount(ClarificationCard,{props:{question:{...question,mode:'multiple',selected:['brand']},id:'q'}})
 expect(w.findAll('input[type="checkbox"]')).toHaveLength(2)
 expect(w.get('textarea').attributes('aria-label')).toBe('补充或纠正回答')
 expect(w.get('button').text()).toBe('提交回答')
})
it('renders text-only and read-only historical answers in the same form',async()=>{
 const w=mount(ClarificationCard,{props:{question:{...question,mode:'text',options:[],text:'按开票日期',submitted:true},id:'q',readonly:true}})
 expect(w.findAll('input')).toHaveLength(0)
 expect(w.get('fieldset').attributes('disabled')).toBeDefined()
 expect(w.find('button').exists()).toBe(false)
})
